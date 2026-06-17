const xlsx = require('xlsx');

// Master Menu
const masterMenuData = [
  { 'ID': 'b1', 'Item Name': 'Bruschetta Trio', 'Description': 'Tomato basil - Roasted mushroom', 'Category': 'Small Plates', 'Base Price': 10, 'Current Price': 10, 'Discount %': 0, 'Seasonal Tag': '', 'Active (Y/N)': 'Y' },
  { 'ID': 'b2', 'Item Name': 'Seasonal Pie', 'Description': 'Freshly baked', 'Category': 'Desserts', 'Base Price': 15, 'Current Price': 12, 'Discount %': 20, 'Seasonal Tag': 'Holiday Special', 'Active (Y/N)': 'Y' },
  { 'ID': 'b3', 'Item Name': 'Inactive Item', 'Description': 'This is out of stock', 'Category': 'Mains', 'Base Price': 20, 'Current Price': 20, 'Discount %': 0, 'Seasonal Tag': '', 'Active (Y/N)': 'N' },
];

const todaysMenuData = [
  { 'Item ID': 'b1' },
];

const seasonalMenuData = [
  { 'Item ID': 'b2' },
];

const wb = xlsx.utils.book_new();

const wsMaster = xlsx.utils.json_to_sheet(masterMenuData);
xlsx.utils.book_append_sheet(wb, wsMaster, "Master Menu");

const wsTodays = xlsx.utils.json_to_sheet(todaysMenuData);
xlsx.utils.book_append_sheet(wb, wsTodays, "Todays Menu");

const wsSeasonal = xlsx.utils.json_to_sheet(seasonalMenuData);
xlsx.utils.book_append_sheet(wb, wsSeasonal, "Seasonal Menus");

xlsx.writeFile(wb, './public/bistro-menu-template.xlsx');
console.log('Template generated!');
