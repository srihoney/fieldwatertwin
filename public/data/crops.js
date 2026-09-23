/*
  Crop parameter presets for Version 1.
  Values are assembled from the FAO-56 table data shipped in the user's
  pyfao56 package (Tables 11, 12, 17, 22) where available. They are defaults,
  not field-specific measurements, and remain editable in the UI.
*/
window.CROP_PRESETS = {
  generic: {name:"Generic irrigated crop", annual:true, kc:[0.40,1.05,0.60], kcb:[0.20,1.00,0.50], stages:[25,40,50,30], zr:1.20, p:0.50, plantMonth:4, plantDay:15},
  corn: {name:"Corn / maize (grain)", annual:true, kc:[0.30,1.20,0.35], kcb:[0.15,1.15,0.15], stages:[30,40,50,30], zr:1.70, p:0.55, plantMonth:4, plantDay:15},
  cotton: {name:"Cotton", annual:true, kc:[0.35,1.17,0.60], kcb:[0.15,1.12,0.45], stages:[30,50,60,55], zr:1.70, p:0.65, plantMonth:4, plantDay:15},
  rice: {name:"Rice", annual:true, kc:[1.05,1.20,0.75], kcb:[1.00,1.15,0.57], stages:[30,30,60,30], zr:1.00, p:0.20, plantMonth:5, plantDay:1},
  sorghum: {name:"Sorghum (grain)", annual:true, kc:[0.30,1.05,0.55], kcb:[0.15,1.00,0.35], stages:[20,35,40,30], zr:2.00, p:0.55, plantMonth:5, plantDay:15},
  soybean: {name:"Soybean", annual:true, kc:[0.50,1.15,0.50], kcb:[0.15,1.10,0.30], stages:[20,35,60,25], zr:1.30, p:0.50, plantMonth:5, plantDay:15},
  tomato: {name:"Tomato", annual:true, kc:[0.60,1.15,0.80], kcb:[0.15,1.10,0.70], stages:[35,40,50,30], zr:1.50, p:0.40, plantMonth:4, plantDay:20},
  cucumber: {name:"Cucumber", annual:true, kc:[0.60,1.00,0.75], kcb:[0.15,0.95,0.70], stages:[20,30,40,15], zr:1.20, p:0.50, plantMonth:5, plantDay:20},
  wheat: {name:"Wheat", annual:true, kc:[0.30,1.15,0.25], kcb:[0.15,1.10,0.15], stages:[20,30,60,30], zr:1.50, p:0.55, plantMonth:11, plantDay:15},
  barley: {name:"Barley", annual:true, kc:[0.30,1.15,0.25], kcb:[0.15,1.10,0.15], stages:[20,25,60,30], zr:1.50, p:0.55, plantMonth:11, plantDay:15},
  alfalfa: {name:"Alfalfa / hay", annual:false, kc:[0.40,0.95,0.90], kcb:[0.30,1.15,1.10], stages:[10,20,20,10], zr:2.00, p:0.55, plantMonth:1, plantDay:1},
  grape: {name:"Grapes", annual:false, kc:[0.30,0.85,0.45], kcb:[0.15,0.80,0.40], stages:[20,50,75,60], zr:2.00, p:0.35, plantMonth:3, plantDay:1},
  almond: {name:"Almond", annual:false, kc:[0.40,0.90,0.65], kcb:[0.20,0.85,0.60], stages:[30,50,130,30], zr:2.00, p:0.40, plantMonth:3, plantDay:1},
  walnut: {name:"Walnut", annual:false, kc:[0.50,1.10,0.65], kcb:[0.40,1.05,0.60], stages:[20,10,130,30], zr:2.40, p:0.50, plantMonth:4, plantDay:1},
  pistachio: {name:"Pistachio", annual:false, kc:[0.40,1.10,0.45], kcb:[0.20,1.05,0.40], stages:[20,60,30,40], zr:1.50, p:0.40, plantMonth:2, plantDay:15},
  citrus: {name:"Citrus", annual:false, kc:[0.70,0.65,0.70], kcb:[0.65,0.60,0.65], stages:[60,90,120,95], zr:1.50, p:0.50, plantMonth:1, plantDay:1},
  apple: {name:"Apple / pear / cherry", annual:false, kc:[0.45,0.95,0.70], kcb:[0.35,0.90,0.65], stages:[30,50,130,30], zr:2.00, p:0.50, plantMonth:3, plantDay:1},
  stonefruit: {name:"Peach / stone fruit", annual:false, kc:[0.45,0.90,0.65], kcb:[0.35,0.85,0.60], stages:[30,50,120,30], zr:2.00, p:0.50, plantMonth:3, plantDay:1},
  olive: {name:"Olive", annual:false, kc:[0.65,0.70,0.65], kcb:[0.55,0.65,0.55], stages:[30,90,60,90], zr:1.70, p:0.65, plantMonth:3, plantDay:1}
};

window.CDL_NAMES = {
  0:"Background",1:"Corn",2:"Cotton",3:"Rice",4:"Sorghum",5:"Soybeans",6:"Sunflower",10:"Peanuts",11:"Tobacco",12:"Sweet Corn",13:"Pop or Orn Corn",14:"Mint",21:"Barley",22:"Durum Wheat",23:"Spring Wheat",24:"Winter Wheat",27:"Rye",28:"Oats",31:"Canola",36:"Alfalfa",37:"Other Hay/Non Alfalfa",41:"Sugarbeets",42:"Dry Beans",43:"Potatoes",44:"Other Crops",45:"Sugarcane",46:"Sweet Potatoes",47:"Misc Vegs & Fruits",48:"Watermelons",49:"Onions",50:"Cucumbers",51:"Chick Peas",52:"Lentils",53:"Peas",54:"Tomatoes",55:"Caneberries",56:"Hops",57:"Herbs",58:"Clover/Wildflowers",59:"Sod/Grass Seed",60:"Switchgrass",61:"Fallow/Idle Cropland",62:"Pasture/Grass",63:"Forest",64:"Shrubland",65:"Barren",66:"Cherries",67:"Peaches",68:"Apples",69:"Grapes",70:"Christmas Trees",71:"Other Tree Crops",72:"Citrus",74:"Pecans",75:"Almonds",76:"Walnuts",77:"Pears",81:"Clouds/No Data",82:"Developed",83:"Water",87:"Wetlands",92:"Aquaculture",111:"Open Water",121:"Developed/Open Space",131:"Barren",141:"Deciduous Forest",142:"Evergreen Forest",152:"Shrubland",176:"Grassland/Pasture",190:"Woody Wetlands",195:"Herbaceous Wetlands",204:"Pistachios",205:"Triticale",206:"Carrots",207:"Asparagus",208:"Garlic",209:"Cantaloupes",210:"Prunes",211:"Olives",212:"Oranges",213:"Honeydew Melons",214:"Broccoli",215:"Avocados",216:"Peppers",217:"Pomegranates",218:"Nectarines",219:"Greens",220:"Plums"
};

window.CDL_TO_PRESET = {
  1:"corn",2:"cotton",3:"rice",4:"sorghum",5:"soybean",21:"barley",22:"wheat",23:"wheat",24:"wheat",36:"alfalfa",50:"cucumber",54:"tomato",66:"apple",67:"stonefruit",68:"apple",69:"grape",72:"citrus",75:"almond",76:"walnut",77:"apple",204:"pistachio",210:"stonefruit",211:"olive",212:"citrus",218:"stonefruit",220:"stonefruit"
};
