CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  photo_url VARCHAR(512) NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  preferred_styles TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE brands (
  brand_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  logo_url VARCHAR(512) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE markets (
  market_id INT AUTO_INCREMENT PRIMARY KEY,
  season VARCHAR(50) NOT NULL,
  gender VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE piece_items (
  piece_item_id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  market_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  piece_type VARCHAR(80) NOT NULL,
  color VARCHAR(80) NOT NULL,
  material VARCHAR(80) NOT NULL,
  store_url VARCHAR(512) NULL,
  price_range VARCHAR(60) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_piece_items_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
  CONSTRAINT fk_piece_items_market FOREIGN KEY (market_id) REFERENCES markets(market_id)
);

CREATE TABLE wardrobe_items (
  wardrobe_item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brand_id INT NOT NULL,
  market_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  piece_type VARCHAR(80) NOT NULL,
  color VARCHAR(80) NOT NULL,
  material VARCHAR(80) NOT NULL,
  style_tags TEXT NULL,
  occasion_tags TEXT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wardrobe_items_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_wardrobe_items_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
  CONSTRAINT fk_wardrobe_items_market FOREIGN KEY (market_id) REFERENCES markets(market_id)
);

CREATE TABLE schemes (
  scheme_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  creation_mode ENUM('manual','ai') NOT NULL,
  style VARCHAR(100) NOT NULL,
  occasion VARCHAR(100) NOT NULL,
  visibility ENUM('private','public') NOT NULL,
  community_indexed BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image_url VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_schemes_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE scheme_items (
  scheme_item_id INT AUTO_INCREMENT PRIMARY KEY,
  scheme_id INT NOT NULL,
  wardrobe_item_id INT NOT NULL,
  slot ENUM('upper','lower','shoes','accessory') NOT NULL,
  sort_order INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scheme_items_scheme FOREIGN KEY (scheme_id) REFERENCES schemes(scheme_id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_items_wardrobe_item FOREIGN KEY (wardrobe_item_id) REFERENCES wardrobe_items(wardrobe_item_id)
);
