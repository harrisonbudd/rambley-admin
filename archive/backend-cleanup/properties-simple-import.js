import pool from '../config/database.js';

const importPropertySimple = async () => {
  try {
    console.log('🔄 Starting simple property import...');

    // Drop existing properties table and create new one
    console.log('🗑️ Dropping existing properties table...');
    await pool.query('DROP TABLE IF EXISTS properties CASCADE');

    console.log('🏗️ Creating new properties table with CSV schema...');
    await pool.query(`
      CREATE TABLE properties (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- CSV Fields with exact header mapping
        property_json TEXT,
        property_id INTEGER,
        platform VARCHAR(255),
        host VARCHAR(255),
        host_email VARCHAR(255),
        host_phone VARCHAR(255),
        url VARCHAR(500),
        property_title VARCHAR(500),
        internal_name VARCHAR(500),
        type VARCHAR(100),
        sub_type VARCHAR(100),
        listing_type VARCHAR(100),
        floors_in_building INTEGER,
        listing_floor INTEGER,
        year_built VARCHAR(50),
        property_size VARCHAR(100),
        unit_measurement VARCHAR(50),
        bedrooms INTEGER,
        beds INTEGER,
        baths INTEGER,
        photos INTEGER,
        number_of_guests INTEGER,
        listing_description TEXT,
        your_property TEXT,
        guest_access TEXT,
        interaction_with_guests TEXT,
        other_details_to_note TEXT,
        amenities TEXT,
        property_location TEXT,
        property_google_maps_link VARCHAR(500),
        location_instructions TEXT,
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        pets_allowed BOOLEAN,
        number_of_pets_allowed INTEGER,
        events_allowed BOOLEAN,
        smoking_vaping_allowed BOOLEAN,
        quiet_hours VARCHAR(255),
        commercial_photography_allowed VARCHAR(255),
        additional_rules TEXT,
        safety_considerations TEXT,
        safety_devices TEXT,
        property_info TEXT,
        reviews INTEGER,
        rating DECIMAL(3,2),
        directions TEXT,
        check_in_method TEXT,
        wifi_network_name VARCHAR(255),
        wifi_password VARCHAR(255),
        house_manual TEXT,
        checkout_instructions_lockup TEXT
      )
    `);

    console.log('📝 Inserting Bali villa property data manually...');
    
    // Manual data entry based on the CSV content we can see
    const insertQuery = `
      INSERT INTO properties (
        account_id, property_json, property_id, platform, host, host_email, host_phone, url,
        property_title, internal_name, type, sub_type, listing_type, floors_in_building,
        listing_floor, year_built, property_size, unit_measurement, bedrooms, beds, baths,
        photos, number_of_guests, listing_description, your_property, guest_access,
        interaction_with_guests, other_details_to_note, amenities, property_location,
        property_google_maps_link, location_instructions, check_in_time, check_out_time,
        pets_allowed, number_of_pets_allowed, events_allowed, smoking_vaping_allowed,
        quiet_hours, commercial_photography_allowed, additional_rules, safety_considerations,
        safety_devices, property_info, reviews, rating, directions, check_in_method,
        wifi_network_name, wifi_password, house_manual, checkout_instructions_lockup
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
      ) RETURNING id, property_title, host_phone
    `;

    const insertValues = [
      '{"Property Id":1,"Platform":"Airbnb","Host":"Kaum Villas","Host Email":"info@kaumvillas.com","Host Phone":"whatsapp:+31630211666","URL":"airbnb.com/h/kaum-villa","Property Title":"Bali Oasis: 2BR Villa Private Pool & Fast Wi-Fi","Internal Name":"","Type":"House","Sub-type":"Villa","Listing Type":"Entire Place","How many floors in the building?":1,"Which floor is the listing on?":1,"Year Built":"","Property Size":"","Unit Measurement":"","Bedrooms":2,"Beds":2,"Baths":2,"Photos":50,"Number of Guests":4}', // property_json
      1, // property_id
      'Airbnb', // platform
      'Kaum Villas', // host
      'info@kaumvillas.com', // host_email
      'whatsapp:+31630211666', // host_phone
      'airbnb.com/h/kaum-villa', // url
      'Bali Oasis: 2BR Villa Private Pool & Fast Wi-Fi', // property_title
      '', // internal_name
      'House', // type
      'Villa', // sub_type
      'Entire Place', // listing_type
      1, // floors_in_building
      1, // listing_floor
      '', // year_built
      '', // property_size
      '', // unit_measurement
      2, // bedrooms
      2, // beds
      2, // baths
      50, // photos
      4, // number_of_guests
      'Step into the "Bali Oasis" at Kaum Villas, a modern haven nestled in the vibrant heart of Seminyak. Immerse yourself in the allure of Bali with a spacious boutique villa featuring two king bedrooms and an array of upscale amenities. Our villa is designed for both relaxation and entertainment, boasting a large private pool, an open-plan kitchen, en-suite bathrooms, high-speed WiFi, an invigorating outdoor shower, comfortable sun lounges, and a captivating alfresco dining area.', // listing_description
      'A Tropical Paradise:\nExperience serenity and sophistication as you enter Kaum Villas. Our villa captures the essence of exotic Balinese charm, offering a retreat that seamlessly balances luxury and comfort. Situated in the heart of Seminyak, we\'re just a two-minute drive from the bustling Seminyak Square, a mere five minutes from the renowned Ku De Ta beach club, and the enchanting Seminyak beach.\n\nUnwind in Style:\nIndulge in an exclusive and secluded Bali experience, right at the heart of Seminyak\'s dynamic energy. Our open-plan layout invites the cool ocean breeze, seamlessly connecting indoor spaces with outdoor sunbathing beds and the poolside cabana—an idyllic sanctuary to unwind and rejuvenate after a day of exploration.\n\nPrivate Bliss:\nDiscover your personal haven within our pool and garden, ensuring uninterrupted relaxation. Stay seamlessly connected with reliable high-speed WiFi accessible in the bedroom, kitchen, living room, and poolside areas. Whether you\'re working remotely or enjoying video streaming, our villa offers the technology you need.\n\nLuxury Retreat:\nEach bedroom is a sanctuary of comfort, adorned with king beds for restful slumber. Indulge in air-conditioned bliss and enjoy the convenience of en-suite bathrooms for added privacy. Large HD TVs provide entertainment, perfect for unwinding with your favorite shows.\n\nExplore and Indulge:\nEmbrace the vibrant Seminyak scene with ease from Kaum Villas. From the bustling Seminyak Square to the chic Ku De Ta beach club and the sun-kissed Seminyak beach, the best of Bali is within reach.\n\nYour Balinese Getaway:\nDiscover the allure of Kaum Villas, where contemporary elegance intertwines with Balinese charm. Whether you seek relaxation or exploration, our villa promises an unforgettable escape. Secure your stay today and experience the ultimate blend of luxury and convenience in Seminyak.', // your_property
      'Guests enjoy exclusive access to the entire villa, ensuring a truly private experience. Every corner of this serene sanctuary is yours to explore and enjoy.', // guest_access
      'Rest assured, we\'re available around the clock to provide assistance as needed. Your comfort and enjoyment are our priority. Experience Bali with peace of mind, knowing that our support is just a message away.', // interaction_with_guests
      '', // other_details_to_note
      'Air conditioning, Bed linens, Bidet, Body soap, Ceiling fan, Clothing storage, Wardrobe., Conditioner, Cooking basics, Pots and pans, oil, salt and pepper, Dedicated workspace, Guests have a desk or table that\'s used just for working, along with a comfortable chair, Dining table, Dishes and silverware, Bowls, chopsticks, plates, cups, etc., Drying rack for clothing, Essentials, Towels, bed sheets, soap, and toilet paper, Extra pillows and blankets, Free parking on premises, Free street parking, Freezer, Hair dryer, Hangers, Hot water, Hot water kettle, Iron, Kitchen, Space where guests can cook their own meals, Laundromat nearby, Long term stays allowed, Allow stay for 28 days or more, Microwave, Outdoor dining area, Outdoor furniture, Outdoor shower, Patio or balcony, Pool, Private., Portable fans, Refrigerator, Room-darkening shades, Shampoo, Single level home, No stairs in home, Sound system, Aux, Bluetooth., Stove, Toaster, TV, HD • Apple TV, Netflix., Wifi, Available throughout the listing, Wine glasses', // amenities
      'Jl. Bidadari II Gg. 1 No.10, Seminyak, Kec. Kuta Utara, Kabupaten Badung, Bali 80361, Indonesia', // property_location
      'https://goo.gl/maps/7WYcZQPyjHTDmUKH8', // property_google_maps_link
      '', // location_instructions
      '2:00 PM', // check_in_time
      '11:00 AM', // check_out_time
      true, // pets_allowed
      1, // number_of_pets_allowed
      false, // events_allowed
      true, // smoking_vaping_allowed
      '', // quiet_hours
      '', // commercial_photography_allowed
      '', // additional_rules
      '', // safety_considerations
      '', // safety_devices
      '', // property_info
      168, // reviews
      4.74, // rating
      '', // directions
      'You\'ll find the lockbox to the left of the front door. Please use the provided code on Airbnb to unlock the box.', // check_in_method
      'kaum_villa', // wifi_network_name
      'balilestari', // wifi_password
      '', // house_manual
      'On check-out, please lock the front door and place the key back into the lockbox with the box closed and the numbers randomised.' // checkout_instructions_lockup
    ];

    console.log('📊 Insert values count:', insertValues.length);

    const result = await pool.query(insertQuery, insertValues);
    const insertedProperty = result.rows[0];

    console.log('✅ Property import completed successfully!');
    console.log('📊 Imported property:');
    console.log(`   ID: ${insertedProperty.id}`);
    console.log(`   Title: ${insertedProperty.property_title}`);
    console.log(`   Host Phone: ${insertedProperty.host_phone}`);

    // Verify the import
    const verifyQuery = 'SELECT COUNT(*) as count FROM properties WHERE account_id = 1';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📈 Total properties in database: ${verifyResult.rows[0].count}`);

    return insertedProperty;

  } catch (error) {
    console.error('💥 Property import failed:', error);
    throw error;
  }
};

export { importPropertySimple };

// If running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importPropertySimple()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}