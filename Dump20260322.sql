-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: blackjack_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `game_statistics`
--

DROP TABLE IF EXISTS `game_statistics`;
/*!50001 DROP VIEW IF EXISTS `game_statistics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `game_statistics` AS SELECT 
 1 AS `username`,
 1 AS `total_hands`,
 1 AS `wins`,
 1 AS `losses`,
 1 AS `blackjacks`,
 1 AS `busts`,
 1 AS `win_rate_pct`,
 1 AS `total_chips_won`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `round_number` int NOT NULL DEFAULT '1',
  `deck_state` json DEFAULT NULL,
  `dealer_hand` json DEFAULT NULL,
  `status` enum('dealing','player_turns','dealer_turn','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dealing',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_room_round` (`room_id`,`round_number`),
  CONSTRAINT `games_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (3,4,1,'[{\"id\": \"spades_10_0\", \"suit\": \"spades\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"clubs_4_0\", \"suit\": \"clubs\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"hearts_8_0\", \"suit\": \"hearts\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"diamonds_8_0\", \"suit\": \"diamonds\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"diamonds_6_0\", \"suit\": \"diamonds\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"hearts_K_0\", \"suit\": \"hearts\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"clubs_6_0\", \"suit\": \"clubs\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"hearts_J_0\", \"suit\": \"hearts\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"diamonds_9_0\", \"suit\": \"diamonds\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"spades_A_0\", \"suit\": \"spades\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"hearts_6_0\", \"suit\": \"hearts\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"spades_4_0\", \"suit\": \"spades\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"diamonds_10_0\", \"suit\": \"diamonds\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"hearts_Q_0\", \"suit\": \"hearts\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"diamonds_J_0\", \"suit\": \"diamonds\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"diamonds_Q_0\", \"suit\": \"diamonds\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"diamonds_A_0\", \"suit\": \"diamonds\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"clubs_3_0\", \"suit\": \"clubs\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"spades_K_0\", \"suit\": \"spades\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"diamonds_7_0\", \"suit\": \"diamonds\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"diamonds_K_0\", \"suit\": \"diamonds\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"clubs_10_0\", \"suit\": \"clubs\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"spades_Q_0\", \"suit\": \"spades\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"clubs_7_0\", \"suit\": \"clubs\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"clubs_Q_0\", \"suit\": \"clubs\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"hearts_9_0\", \"suit\": \"hearts\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"clubs_5_0\", \"suit\": \"clubs\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"hearts_10_0\", \"suit\": \"hearts\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"spades_J_0\", \"suit\": \"spades\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"clubs_9_0\", \"suit\": \"clubs\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"hearts_5_0\", \"suit\": \"hearts\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"clubs_K_0\", \"suit\": \"clubs\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"diamonds_5_0\", \"suit\": \"diamonds\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"hearts_A_0\", \"suit\": \"hearts\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"spades_7_0\", \"suit\": \"spades\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"hearts_3_0\", \"suit\": \"hearts\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"spades_2_0\", \"suit\": \"spades\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"diamonds_4_0\", \"suit\": \"diamonds\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"diamonds_3_0\", \"suit\": \"diamonds\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"clubs_8_0\", \"suit\": \"clubs\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"spades_9_0\", \"suit\": \"spades\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"clubs_J_0\", \"suit\": \"clubs\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"hearts_4_0\", \"suit\": \"hearts\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"clubs_2_0\", \"suit\": \"clubs\", \"value\": \"2\", \"numeric\": 2}]','[{\"id\": \"hearts_2_0\", \"suit\": \"hearts\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"spades_6_0\", \"suit\": \"spades\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"clubs_J_0\", \"suit\": \"clubs\", \"value\": \"J\", \"numeric\": 10}]','finished','2026-03-23 03:53:37','2026-03-23 03:54:25'),(4,4,2,'[{\"id\": \"diamonds_10_0\", \"suit\": \"diamonds\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"diamonds_9_0\", \"suit\": \"diamonds\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"hearts_9_0\", \"suit\": \"hearts\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"hearts_10_0\", \"suit\": \"hearts\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"clubs_2_0\", \"suit\": \"clubs\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"spades_10_0\", \"suit\": \"spades\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"clubs_6_0\", \"suit\": \"clubs\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"hearts_5_0\", \"suit\": \"hearts\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"hearts_7_0\", \"suit\": \"hearts\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"diamonds_Q_0\", \"suit\": \"diamonds\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"clubs_K_0\", \"suit\": \"clubs\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"clubs_4_0\", \"suit\": \"clubs\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"diamonds_7_0\", \"suit\": \"diamonds\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"diamonds_3_0\", \"suit\": \"diamonds\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"clubs_J_0\", \"suit\": \"clubs\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"clubs_5_0\", \"suit\": \"clubs\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"diamonds_6_0\", \"suit\": \"diamonds\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"clubs_Q_0\", \"suit\": \"clubs\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"hearts_6_0\", \"suit\": \"hearts\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"diamonds_K_0\", \"suit\": \"diamonds\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"spades_8_0\", \"suit\": \"spades\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"clubs_A_0\", \"suit\": \"clubs\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"spades_J_0\", \"suit\": \"spades\", \"value\": \"J\", \"numeric\": 10}, {\"id\": \"hearts_K_0\", \"suit\": \"hearts\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"hearts_Q_0\", \"suit\": \"hearts\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"hearts_A_0\", \"suit\": \"hearts\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"hearts_4_0\", \"suit\": \"hearts\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"clubs_7_0\", \"suit\": \"clubs\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"spades_K_0\", \"suit\": \"spades\", \"value\": \"K\", \"numeric\": 10}, {\"id\": \"diamonds_A_0\", \"suit\": \"diamonds\", \"value\": \"A\", \"numeric\": 11}, {\"id\": \"spades_7_0\", \"suit\": \"spades\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"clubs_10_0\", \"suit\": \"clubs\", \"value\": \"10\", \"numeric\": 10}, {\"id\": \"spades_4_0\", \"suit\": \"spades\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"spades_9_0\", \"suit\": \"spades\", \"value\": \"9\", \"numeric\": 9}, {\"id\": \"diamonds_4_0\", \"suit\": \"diamonds\", \"value\": \"4\", \"numeric\": 4}, {\"id\": \"diamonds_8_0\", \"suit\": \"diamonds\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"diamonds_5_0\", \"suit\": \"diamonds\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"spades_5_0\", \"suit\": \"spades\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"clubs_3_0\", \"suit\": \"clubs\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"spades_6_0\", \"suit\": \"spades\", \"value\": \"6\", \"numeric\": 6}, {\"id\": \"diamonds_2_0\", \"suit\": \"diamonds\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"spades_3_0\", \"suit\": \"spades\", \"value\": \"3\", \"numeric\": 3}, {\"id\": \"spades_Q_0\", \"suit\": \"spades\", \"value\": \"Q\", \"numeric\": 10}, {\"id\": \"spades_A_0\", \"suit\": \"spades\", \"value\": \"A\", \"numeric\": 11}]','[{\"id\": \"hearts_8_0\", \"suit\": \"hearts\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"clubs_8_0\", \"suit\": \"clubs\", \"value\": \"8\", \"numeric\": 8}]','player_turns','2026-03-23 03:55:08',NULL);
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_hands`
--

DROP TABLE IF EXISTS `player_hands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_hands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `player_id` int NOT NULL,
  `cards` json NOT NULL,
  `final_score` int DEFAULT NULL,
  `result` enum('win','lose','push','blackjack','bust') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bet_amount` int NOT NULL DEFAULT '0',
  `chips_delta` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `idx_game_player` (`game_id`,`player_id`),
  CONSTRAINT `player_hands_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_hands_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_hands`
--

LOCK TABLES `player_hands` WRITE;
/*!40000 ALTER TABLE `player_hands` DISABLE KEYS */;
INSERT INTO `player_hands` VALUES (7,3,6,'[{\"id\": \"hearts_7_0\", \"suit\": \"hearts\", \"value\": \"7\", \"numeric\": 7}, {\"id\": \"spades_5_0\", \"suit\": \"spades\", \"value\": \"5\", \"numeric\": 5}, {\"id\": \"clubs_2_0\", \"suit\": \"clubs\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"hearts_4_0\", \"suit\": \"hearts\", \"value\": \"4\", \"numeric\": 4}]',18,'push',100,0),(8,3,7,'[{\"id\": \"diamonds_2_0\", \"suit\": \"diamonds\", \"value\": \"2\", \"numeric\": 2}, {\"id\": \"clubs_A_0\", \"suit\": \"clubs\", \"value\": \"A\", \"numeric\": 11}]',13,'lose',100,-100),(9,3,9,'[{\"id\": \"spades_8_0\", \"suit\": \"spades\", \"value\": \"8\", \"numeric\": 8}, {\"id\": \"spades_3_0\", \"suit\": \"spades\", \"value\": \"3\", \"numeric\": 3}]',11,'lose',100,-100),(10,4,6,'[]',NULL,NULL,100,NULL),(11,4,7,'[]',NULL,NULL,100,NULL),(12,4,9,'[]',NULL,NULL,100,NULL);
/*!40000 ALTER TABLE `player_hands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chips` int NOT NULL DEFAULT '1000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (5,'raga',NULL,900,'2026-03-23 03:20:42','2026-03-23 03:22:28'),(6,'santiago',NULL,900,'2026-03-23 03:21:31','2026-03-23 03:51:37'),(7,'manuel',NULL,800,'2026-03-23 03:21:47','2026-03-23 03:54:25'),(8,'admin',NULL,99999,'2026-03-22 22:34:19','2026-03-23 03:52:57'),(9,'simon',NULL,900,'2026-03-23 03:38:18','2026-03-23 03:54:25');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `probability_snapshots`
--

DROP TABLE IF EXISTS `probability_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `probability_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `player_id` int NOT NULL,
  `snapshot_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cards_dealt` int NOT NULL,
  `cards_remaining` int NOT NULL,
  `prob_win` decimal(6,4) NOT NULL,
  `prob_bust` decimal(6,4) NOT NULL,
  `prob_push` decimal(6,4) NOT NULL,
  `current_score` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `probability_snapshots_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE,
  CONSTRAINT `probability_snapshots_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `probability_snapshots`
--

LOCK TABLES `probability_snapshots` WRITE;
/*!40000 ALTER TABLE `probability_snapshots` DISABLE KEYS */;
INSERT INTO `probability_snapshots` VALUES (4,3,6,'2026-03-23 03:54:02',9,43,0.5529,0.6047,0.0142,14),(5,3,6,'2026-03-23 03:54:13',10,42,0.6711,0.9048,0.0662,18),(6,4,6,'2026-03-23 03:58:06',9,43,0.6163,0.6977,0.0098,16);
/*!40000 ALTER TABLE `probability_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_players`
--

DROP TABLE IF EXISTS `room_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `player_id` int NOT NULL,
  `seat_number` int NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_seat` (`room_id`,`seat_number`),
  UNIQUE KEY `uq_room_player` (`room_id`,`player_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `room_players_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `room_players_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_players`
--

LOCK TABLES `room_players` WRITE;
/*!40000 ALTER TABLE `room_players` DISABLE KEYS */;
INSERT INTO `room_players` VALUES (10,4,6,1,'2026-03-23 03:52:16',1),(11,4,7,2,'2026-03-23 03:52:33',1),(12,4,9,3,'2026-03-23 03:52:38',1);
/*!40000 ALTER TABLE `room_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_player_id` int NOT NULL,
  `status` enum('waiting','active','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `max_players` int NOT NULL DEFAULT '5',
  `decks_count` int NOT NULL DEFAULT '1',
  `invite_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `invite_token` (`invite_token`),
  KEY `admin_player_id` (`admin_player_id`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`admin_player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rooms`
--

LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (4,'NBQNM7',6,'active',3,1,'q19KrLOuoHvjaSYJc6KwWwTnO0kjW7qJGOKQSQh7BBs','2026-03-23 03:52:16','2026-03-23 03:55:08',NULL);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `game_statistics`
--

/*!50001 DROP VIEW IF EXISTS `game_statistics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `game_statistics` AS select `p`.`username` AS `username`,count(`ph`.`id`) AS `total_hands`,sum((case when (`ph`.`result` = 'win') then 1 else 0 end)) AS `wins`,sum((case when (`ph`.`result` = 'lose') then 1 else 0 end)) AS `losses`,sum((case when (`ph`.`result` = 'blackjack') then 1 else 0 end)) AS `blackjacks`,sum((case when (`ph`.`result` = 'bust') then 1 else 0 end)) AS `busts`,round(((sum((case when (`ph`.`result` in ('win','blackjack')) then 1 else 0 end)) / count(`ph`.`id`)) * 100),2) AS `win_rate_pct`,sum(`ph`.`chips_delta`) AS `total_chips_won` from (`players` `p` join `player_hands` `ph` on((`p`.`id` = `ph`.`player_id`))) where (`p`.`id` <> 0) group by `p`.`id`,`p`.`username` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-22 23:02:10
