// Count the exact columns for debugging

const insertColumns = [
  'account_id', 'property_json', 'property_id', 'platform', 'host', 'host_email', 'host_phone', 'url',
  'property_title', 'internal_name', 'type', 'sub_type', 'listing_type', 'floors_in_building',
  'listing_floor', 'year_built', 'property_size', 'unit_measurement', 'bedrooms', 'beds', 'baths',
  'photos', 'number_of_guests', 'listing_description', 'your_property', 'guest_access',
  'interaction_with_guests', 'other_details_to_note', 'amenities', 'property_location',
  'property_google_maps_link', 'location_instructions', 'check_in_time', 'check_out_time',
  'pets_allowed', 'number_of_pets_allowed', 'events_allowed', 'smoking_vaping_allowed',
  'quiet_hours', 'commercial_photography_allowed', 'additional_rules', 'safety_considerations',
  'safety_devices', 'property_info', 'reviews', 'rating', 'directions', 'check_in_method',
  'wifi_network_name', 'wifi_password', 'house_manual', 'checkout_instructions_lockup'
];

console.log('📊 INSERT columns count:', insertColumns.length);
console.log('📋 INSERT columns:', insertColumns);

const csvHeaders = [
  'Property JSON', 'Property Id', 'Platform', 'Host', 'Host Email', 'Host Phone', 'URL',
  'Property Title', 'Internal Name', 'Type', 'Sub-type', 'Listing Type',
  'How many floors in the building?', 'Which floor is the listing on?', 'Year Built',
  'Property Size', 'Unit Measurement', 'Bedrooms', 'Beds', 'Baths', 'Photos',
  'Number of Guests', 'Listing Description', 'Your Property', 'Guest Access',
  'Interaction with guests', 'Other details to note', 'Amenities', 'Property Location',
  'Property Google Maps Link', 'Location Instructions', 'Check-in Time', 'Check-out Time',
  'Pets Allowed', 'Number of Pets Allowed', 'Events Allowed',
  'Smoking, vaping, e‑cigarettes allowed', 'Quiet hours',
  'Commercial photography and filming allowed', 'Additional Rules', 'Safety Considerations',
  'Safety Devices', 'Property Info', 'Reviews', 'Rating', 'Directions', 'Check-in Method',
  'Wifi Network Name', 'Wifi Password', 'House Manual', 'Check-out Instructions - Lock-up'
];

console.log('📊 CSV headers count:', csvHeaders.length);
console.log('📋 CSV headers:', csvHeaders);

console.log('\n🔍 Column mapping:');
csvHeaders.forEach((header, i) => {
  const dbColumn = insertColumns[i + 1]; // +1 because first INSERT column is account_id
  console.log(`  ${i + 1}: "${header}" → ${dbColumn || 'MISSING'}`);
});