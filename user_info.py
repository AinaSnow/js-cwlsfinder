import httpx
import csv
import asyncio

async def fetch_data(url, cookies):
    async with httpx.AsyncClient() as client:
        response = await client.get(url, cookies=cookies)
        return response.json()

async def main():
    base_url = "https://apiff14risingstones.web.sdo.com/api/home/userInfo/getUserInfo?uuid="
    cookies = {
    '': '',  # 替换为你的Cookie信息
    }

    start_uuid = 10001001
    end_uuid = 10099999

    # 循环遍历UUID范围
    for uuid in range(start_uuid, end_uuid + 1):
        url = base_url + str(uuid)

        # 异步获取JSON数据
        data = await fetch_data(url, cookies)

        if data:
            # 提取多个二级字段
            user_info = data.get('data', {})
            uuid = user_info.get('uuid')
            area = user_info.get('area_name')
            group = user_info.get('group_name')
            character = user_info.get('character_name')
            user_info = data.get('data', {}).get('characterDetail', [{}])[0]
            fc_name = user_info.get('guild_name')
            fc_tag = user_info.get('guild_tag')
            fc_id = user_info.get('fc_id')

            # 将数据写入CSV文件
            with open('user_info.csv', 'a', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['uuid','area_name', 'group_name', 'character_name','guild_name','guild_tag','fc_id']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

                # 写入字段的值
                writer.writerow({
                    'uuid': uuid,
                    'area_name': area,
                    'group_name': group,
                    'character_name': character,
                    'guild_name': fc_name,
                    'guild_tag': fc_tag,
                    'fc_id' : fc_id
                })

            print(f"UUID {uuid}: 用户信息已存储到 user_info.csv 文件中。")
        else:
            print(f"UUID {uuid}: 无法获取响应。")

if __name__ == "__main__":
    asyncio.run(main())