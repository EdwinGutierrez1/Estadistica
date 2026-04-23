    CREATE DATABASE IF NOT EXISTS blackjack_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE blackjack_db;

CREATE TABLE IF NOT EXISTS players (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) UNIQUE,
    chips       INT          NOT NULL DEFAULT 1000,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen   DATETIME     ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
    id              INT          AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(8)   NOT NULL UNIQUE,
    admin_player_id INT          NOT NULL,
    status          ENUM('waiting','active','finished') NOT NULL DEFAULT 'waiting',
    max_players     INT          NOT NULL DEFAULT 5,
    decks_count     INT          NOT NULL DEFAULT 1,
    invite_token    VARCHAR(64)  NOT NULL UNIQUE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at      DATETIME,
    finished_at     DATETIME,
    FOREIGN KEY (admin_player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_code   (code),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS room_players (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    room_id     INT NOT NULL,
    player_id   INT NOT NULL,
    seat_number INT NOT NULL,
    joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_room_seat   (room_id, seat_number),
    UNIQUE KEY uq_room_player (room_id, player_id),
    FOREIGN KEY (room_id)   REFERENCES rooms(id)   ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS games (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    room_id         INT NOT NULL,
    round_number    INT NOT NULL DEFAULT 1,
    deck_state      JSON,
    dealer_hand     JSON,
    status          ENUM('dealing','player_turns','dealer_turn','finished') NOT NULL DEFAULT 'dealing',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at     DATETIME,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_round (room_id, round_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_hands (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    game_id     INT NOT NULL,
    player_id   INT NOT NULL,
    cards       JSON NOT NULL,
    final_score INT,
    result      ENUM('win','lose','push','blackjack','bust'),
    bet_amount  INT NOT NULL DEFAULT 0,
    chips_delta INT,
    FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_game_player (game_id, player_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS probability_snapshots (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    game_id         INT NOT NULL,
    player_id       INT NOT NULL,
    snapshot_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cards_dealt     INT NOT NULL,
    cards_remaining INT NOT NULL,
    prob_win        DECIMAL(6,4) NOT NULL,
    prob_bust       DECIMAL(6,4) NOT NULL,
    prob_push       DECIMAL(6,4) NOT NULL,
    current_score   INT NOT NULL,
    FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW game_statistics AS
SELECT
    p.username,
    COUNT(ph.id)                                          AS total_hands,
    SUM(CASE WHEN ph.result = 'win'       THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN ph.result = 'lose'      THEN 1 ELSE 0 END) AS losses,
    SUM(CASE WHEN ph.result = 'blackjack' THEN 1 ELSE 0 END) AS blackjacks,
    SUM(CASE WHEN ph.result = 'bust'      THEN 1 ELSE 0 END) AS busts,
    ROUND(
        SUM(CASE WHEN ph.result IN ('win','blackjack') THEN 1 ELSE 0 END)
        / COUNT(ph.id) * 100, 2
    )                                                     AS win_rate_pct,
    SUM(ph.chips_delta)                                   AS total_chips_won
FROM players p
JOIN player_hands ph ON p.id = ph.player_id
WHERE p.id != 0
GROUP BY p.id, p.username;