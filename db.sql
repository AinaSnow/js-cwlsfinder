CREATE TABLE `cwls_result` (
  `seqno` INT(12) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(12) UNSIGNED NOT NULL,
  `cwls_id` VARCHAR(64) NOT NULL,
  `cwls_name` VARCHAR(64) NOT NULL,
  `createdate` DATETIME DEFAULT NOW(),
  primary key(`seqno`),
  unique key(`user_id`, `cwls_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

create user cwlsdb@'%' identified by 'cwlsdbpass';
create database lodestonedb default character set utf8;
grant all privileges on lodestonedb.* to cwlsdb@'%' with grant option;
flush privileges;
alter user 'cwlsdb'@'%' IDENTIFIED WITH mysql_native_password BY 'cwlsdbpass';