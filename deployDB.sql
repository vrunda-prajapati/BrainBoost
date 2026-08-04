-- MySQL dump 10.13  Distrib 9.6.0, for macos26.3 (arm64)
--
-- Host: localhost    Database: brainboost
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '8459e746-3fe4-11f1-bf7f-7ef75ff3a45e:1-125';

--
-- Table structure for table `game_scores`
--

DROP TABLE IF EXISTS `game_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game_name` varchar(50) NOT NULL,
  `score` int DEFAULT '0',
  `level` int DEFAULT '1',
  `moves_taken` int DEFAULT '0',
  `time_taken` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_scores`
--

LOCK TABLES `game_scores` WRITE;
/*!40000 ALTER TABLE `game_scores` DISABLE KEYS */;
INSERT INTO `game_scores` VALUES (1,1,'Memory Match',850,1,20,45,'2026-06-11 06:03:33'),(2,1,'Memory Match',850,1,20,45,'2026-06-11 06:13:30'),(3,5,'Memory Match',1182,1,14,34,'2026-06-12 05:00:34'),(4,5,'Memory Match',1436,2,13,32,'2026-06-12 05:02:19'),(5,5,'Memory Match',1292,1,11,29,'2026-06-12 05:46:11'),(6,5,'Memory Match',1609,2,13,33,'2026-06-12 05:48:52'),(7,4,'Word Scramble',1815,1,6,32,'2026-06-12 06:18:07'),(8,4,'Memory Match',1176,1,16,37,'2026-06-12 06:21:59'),(9,4,'Crossword',0,1,14,25,'2026-06-12 07:12:31'),(10,4,'Crossword',0,1,14,26,'2026-06-12 07:19:15'),(11,4,'Crossword',450,1,14,22,'2026-06-12 07:22:57'),(12,6,'Crossword',450,1,15,29,'2026-06-13 10:45:21'),(13,6,'Memory Match',1314,1,9,18,'2026-06-13 10:48:46'),(14,6,'Word Scramble',1695,1,8,240,'2026-06-13 10:53:00'),(15,4,'Memory Match',1849,3,18,38,'2026-06-15 06:17:31'),(16,4,'Memory Match',1465,2,14,30,'2026-06-15 06:18:14'),(17,4,'Memory Match',1276,1,16,37,'2026-06-15 06:19:11'),(18,4,'Memory Match',1422,2,17,39,'2026-06-15 06:19:53'),(19,4,'Memory Match',1540,3,34,80,'2026-06-15 06:21:17'),(20,7,'Sudoku',2120,1,42,528,'2026-06-17 04:26:30'),(21,7,'Number Puzzle',1744,1,228,252,'2026-06-17 05:02:41'),(22,7,'Pattern Memory',0,1,2,3,'2026-06-17 05:14:55'),(23,7,'Pattern Memory',1800,1,11,116,'2026-06-17 05:17:15'),(24,7,'Memory Match',1182,1,16,34,'2026-06-17 05:29:42'),(25,7,'Memory Match',1519,2,13,28,'2026-06-17 05:30:22'),(26,7,'Memory Match',1791,3,18,42,'2026-06-17 05:31:07'),(27,7,'Memory Match',1701,3,19,37,'2026-06-17 05:31:50'),(28,8,'Number Puzzle',2452,1,188,235,'2026-06-18 04:17:10'),(29,8,'Word Scramble',2008,1,9,139,'2026-06-18 04:19:46'),(30,8,'Memory Match',1238,1,12,31,'2026-06-18 04:20:35'),(31,8,'Memory Match',1568,2,17,41,'2026-06-18 04:21:19'),(32,8,'Memory Match',1754,3,21,48,'2026-06-18 04:22:12'),(33,1,'Crossword',450,1,21,127,'2026-06-19 05:37:27'),(34,1,'Number Puzzle',1325,2,306,335,'2026-06-19 05:43:23'),(35,1,'Pattern Memory',1150,2,8,52,'2026-06-19 05:44:45'),(36,8,'Memory Match',1234,1,14,33,'2026-07-15 17:52:03');
/*!40000 ALTER TABLE `game_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `current_level` int DEFAULT '1',
  `total_score` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `xp` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Vrunda','vrunda@gmail.com','$2b$10$1XgKhCT/.oPMkv5vVtRWoeDf.vi8R5I7AhQf3lqYkPC/GsfjADnWq',1,3775,'2026-06-10 05:47:54',292),(4,'vrunda','vrunda123@gmail.com','$2b$10$6CpLXkAcsfjShHfF2KeHeuu4tWWjJHIj5XDBiqeojiaYCU53HqF3a',2,10993,'2026-06-11 04:14:40',1096),(5,'Smit ','smit@gmail.com','$2b$10$4aoMzsPa8uuV2I6q/c96V.T9tj5BU3Df4nshUAwXJTK0Z97llTvce',1,5519,'2026-06-12 04:58:37',289),(6,'smith','smith@gmail.com','$2b$10$9Q6Yn09K4jEWA/Qy51qRHeLF.8h1M30SVU8FUGWC6yxicrXQphA2O',1,3459,'2026-06-13 10:44:26',345),(7,'Tina ','tina@gmail.com','$2b$10$3lVAa4HAPhVcBjUaAYUtMe2JqY.TZkGpVUILYcSz8jWViMB2ZuyLe',2,11857,'2026-06-17 03:53:35',1184),(8,'Suhani','suhani@gmail.com','$2b$10$UFWE.Jm2/waL3TebrWM50OTCf6EjNDgYgz6XOjaoSHpX84jJw173.',2,10254,'2026-06-18 03:50:37',1022);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 18:54:09
