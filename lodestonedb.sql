/*
Navicat MySQL Data Transfer

Source Server         : 1
Source Server Version : 50735
Source Host           : localhost:3306
Source Database       : lodestonedb

Target Server Type    : MYSQL
Target Server Version : 50735
File Encoding         : 65001

Date: 2021-10-05 21:28:09
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `cwls_result`
-- ----------------------------
DROP TABLE IF EXISTS `cwls_result`;
CREATE TABLE `cwls_result` (
  `seqno` int(12) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(12) unsigned NOT NULL,
  `cwls_id` varchar(64) NOT NULL,
  `cwls_name` varchar(64) NOT NULL,
  `createdate` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`seqno`),
  UNIQUE KEY `user_id` (`user_id`,`cwls_id`)
) ENGINE=InnoDB AUTO_INCREMENT=449 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of cwls_result
-- ----------------------------
