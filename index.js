const axios = require('axios');
const cheerio = require('cheerio');
const { promisify } = require('util');
const mysql = require('mysql');
const redis = require('./libs/redis');

// mysql 연결
var sqlCon = mysql.createConnection({
    host: 'localhost',
    user: 'cwlsdb',
    password: 'cwlsdbpass',
    database: 'lodestonedb',
});
sqlCon.connect();

const CWLSService = function () {};
CWLSService.prototype.delay = (ms = 1000) => new Promise(r => setTimeout(r, ms));

/**
 * 호출할 주소 목록 생성
 *
 * @returns {*[]} 주소 목록
 */
CWLSService.prototype.makeCallList = () => {
    let res = [];
    //26
    for (let priIdx = 0; priIdx < 1; priIdx++) {
        for (let secIdx = 0; secIdx < 1; secIdx++) {
            const searchParam = {
                word: (priIdx + 10).toString(36) + (secIdx + 10).toString(36),
                dcName: 'Mana',
                charCount: '',
                order: 1
            };
            const cwlsFinderUrl = `https://na.finalfantasyxiv.com/lodestone/crossworld_linkshell/?q=${searchParam.word}&dcname=${searchParam.dcName}&character_count=${searchParam.charCount}&order=${searchParam.order}`;
            res.push(cwlsFinderUrl);
        }
    }
    return res;
};

/**
 * 검색
 *
 * @param pList 검색 목록
 */
CWLSService.prototype.fetchCWLS = async function (pList) {
    let cwListRes = [];

    // aa ~ zz
    for (let _idx = 0, _total = pList.length; _idx < _total; _idx++) {
        // 조회 시 쉴틈을 만들자 (429 에러 대비)
        await this.delay();

        // 페이지 단위 조회
        let cwListTotalPage = 1;
        for (let curPage = 1; curPage <= cwListTotalPage; curPage++) {
            try {
                const listRes = await axios.get(`${pList[_idx]}&page=${curPage}`);
                const $ = cheerio.load(listRes.data);

                // Pagination Parse
                if (curPage === 1) {
                    console.log($('ul.btn__pager .btn__pager__current')[0].children[0].data);
                    cwListTotalPage = parseInt($('ul.btn__pager .btn__pager__current')[0].children[0].data.match(/^Page [\d]+ of ([\d]+)$/)[1]);
                }
                console.info(`Fetching CWLS List (Url: ${pList[_idx]}, Idx: ${_idx + 1}, Page: ${curPage} / ${cwListTotalPage}) ...`);

                // 한 페이지에서의 각 서버 초월 링크셸 상세 정보 주소를 다시 들어간다.
                const $cwList = $('.ldst__window').find('div.entry');
                if ($cwList && $cwList.length > 0) {
                    let list = [];
                    $cwList.each(async function (cwIdx, cwData) {
                        const cwName = $(this).find('a .entry__name').text();
                        let url = $(this).find('a').attr('href'),
                            cwId = url.match(/^\/lodestone\/crossworld_linkshell\/([\d\w]+)\/$/)[1];
                        url = `https://na.finalfantasyxiv.com${url}`;
                        list.push({url: url, name: cwName, id: cwId});
                    });

                    // 조회
                    await this.fetchCWLSDetail(list);
                }

                // 조회 시 쉴틈을 만들자 (429 에러 대비)
                await this.delay(500);
            }
            catch (e) {
                console.error(e);
                const saddAsync = promisify(redis.sadd).bind(redis);
                await saddAsync('error-queue', `${pList[_idx]}&page=${curPage}`);
            }
        }
    }
    return cwListRes;
};

/**
 * 상세
 *
 * @param pDetailUrlList 각 서버초월링크셸 주소
 */
CWLSService.prototype.fetchCWLSDetail = async function (pDetailUrlList) {
    let cwDetailListRes = [];

    // 각 서버 초월 상세 정보마다
    for (let _idx = 0, _total = pDetailUrlList.length; _idx < _total; _idx++) {
        // 멤버 페이지 단위 조회
        let cwMemberTotalPage = 1;
        for (let curPage = 1; curPage <= cwMemberTotalPage; curPage++) {
            try {
                const detailRes = await axios.get(pDetailUrlList[_idx].url);
                const $ = cheerio.load(detailRes.data);

                // Pagination Parse
                if (curPage === 1) {
                    cwMemberTotalPage = parseInt($('ul.btn__pager .btn__pager__current')[0].children[0].data.match(/^Page [\d]+ of ([\d]+)$/)[1]);
                }
                console.info(`Fetching CWLS Detail (Name: ${pDetailUrlList[_idx].name}, Url: ${pDetailUrlList[_idx].url}, Idx: ${_idx + 1}, Page: ${curPage} / ${cwMemberTotalPage}) ...`);

                const $cwMemberList = $('.ldst__window').find('div.entry');
                if ($cwMemberList && $cwMemberList.length > 0) {
                    let list = [];
                    $cwMemberList.each(async function (memberIdx, memberData) {
                        const charId = parseInt($(this).find('a').attr('href').match(/^\/lodestone\/character\/([\d]+)\/$/)[1]),
                            charName = $(this).find('p.entry__name').text(),
                            charWorld = $(this).find('p.entry__world').text().trim();

                        list.push({
                            id: charId,
                            name: charName,
                            world: charWorld,
                            cwls: pDetailUrlList[_idx],
                        });
                    });

                    for (const idx in list) {
                        // 이미 값이 있는지 확인
                        sqlCon.query("SELECT user_id, cwls_id FROM cwls_result WHERE user_id = ? AND cwls_id = ?", [list[idx].id, list[idx].cwls.id], function (dbSelErr, dbSelRes) {
                            if (dbSelErr) {
                                throw dbSelErr;
                            }
                            // 없으면 추가
                            if (dbSelRes.length <= 0) {
                                sqlCon.query("INSERT INTO cwls_result(user_id, cwls_id, cwls_name) VALUES (?, ?, ?)", [list[idx].id, list[idx].cwls.id, list[idx].cwls.name], function (dbErr, dbRes) {
                                    if (dbErr) {
                                        throw dbErr;
                                    }
                                });
                            }
                        });
                    }
                    cwDetailListRes.push(list);
                }

                await this.delay(200);
            }
            catch (e) {
                console.error(e);
                const saddAsync = promisify(redis.sadd).bind(redis);
                await saddAsync('error-queue-detail', pDetailUrlList[_idx].url);
            }
        }
    }
    return cwDetailListRes;
};

/**
 * 서비스 시작
 */
CWLSService.prototype.init = async function () {
    await this.fetchCWLS(this.makeCallList());
    sqlCon.end();
};

let _service = new CWLSService();
_service.init().then(() => console.log('Done!'));