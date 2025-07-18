create table users (
id serial primary key not null,
fullname varchar(200) not null,
username varchar(100) not null,
email varchar(100) not null unique,
phone varchar(100) not null unique,
gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
location varchar(200),
role varchar(50) default 'user',
user_type varchar(20) default 'user',
company_id INT default 0,
is_active boolean default True,
last_login timestamp,
created_at timestamp default CURRENT_TIMESTAMP,
updated_at timestamp default CURRENT_TIMESTAMP,
password varchar(255) not null

);



create table admins (
id serial primary key not null,
fullname varchar(200) not null,
username varchar(100) not null,
email varchar(100) not null unique,
phone varchar(100) not null unique,
gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
location varchar(200),
role varchar(50) default 'staff',
user_type varchar(20) default 'staff',
company_id INT default 0,
is_active boolean default True,
last_login timestamp,
created_at timestamp default CURRENT_TIMESTAMP,
updated_at timestamp default CURRENT_TIMESTAMP,
password varchar(255) not null

);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)  NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    image TEXT, -- optional product image
    unit_per_carton INT DEFAULT 1, -- how many units per carton
    carton_cost_price NUMERIC(10, 2) NOT NULL, --  cost per carton
    carton_selling_price NUMERIC(10, 2) NOT NULL,
    unit_cost_price NUMERIC(10, 2) NOT NULL, --  cost per unit
    unit_selling_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0, -- quantity in units (retail)
    threshold INT DEFAULT 5, -- restock alert
    low_stock BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP	
);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES admins(id),
    user_role varchar (50),
    action TEXT NOT NULL,
    is_read boolean DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    company varchar(200),
    name varchar(200) not null,
    phone varchar(200) not null,
    email varchar(200) ,
    location varchar(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES admins(id) ON DELETE CASCADE,
    user_role VARCHAR(50) ,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'cash', 'POS', 'transfer', 'online'
    paid_amount NUMERIC(10, 2),
    change_given NUMERIC(10, 2),
    customer_type VARCHAR(50) DEFAULT 'walk-in',
    customer_name VARCHAR(50) DEFAULT 'walk-in customer',
    note TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




CREATE TABLE company (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) ,
    email VARCHAR(200)  ,
    location VARCHAR(100)  ,
    website VARCHAR(200)  ,
    image TEXT,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES admins(id), -- optional: track who logged the expense
    reason TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE hold_carts(
    id serial primary key,
    user_id INT REFERENCES admins(id), -- optional: track who logged the expense
    user_role varchar(50),
    cart_products TEXT,
    status varchar(20) default 'hold',
    created_at timestamp default CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    row_id INT NOT NULL,
    title VARCHAR(100),
    message TEXT NOT NULL,
    type VARCHAR(50),
    table_name VARCHAR(50),
    is_read boolean DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE product_promos (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    discount_type VARCHAR(10) CHECK (discount_type IN ('fiat', 'percent')),
    applies_to VARCHAR(10) CHECK (applies_to IN ('unit', 'carton', 'both')),
    discount_value NUMERIC(10, 2) NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    status boolean DEFAULT true
);


CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    supplier_id INT REFERENCES suppliers(id),
    cartons INT,
    units_per_carton INT,
    unit_cost NUMERIC(10, 2) NOT NULL,
    quantity INT GENERATED ALWAYS AS (cartons * units_per_carton) STORED,
    total_cost NUMERIC(10, 2) GENERATED ALWAYS AS (unit_cost * (cartons * units_per_carton)) STORED,
    note TEXT,
    status VARCHAR(50) DEFAULT 'purchase',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL,
    apply_to VARCHAR(20),
    selling_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * selling_price) STORED
);



CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");



-- when renaming a column
ALTER TABLE table_name
RENAME COLUMN old_column_name TO new_column_name;

-- when change a column type
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_data_type;