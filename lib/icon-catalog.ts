/** Curated metadata is tiny; additional SVG geometry loads only when needed. */
export const extraIcons={
 dumbbell:['Strength training','Fitness'],run:['Running','Fitness'],yoga:['Yoga','Fitness'],bike:['Cycling','Fitness'],
 book:['Book','Reading'],library:['Library','Reading'],bookmark:['Bookmark','Reading'],pen:['Writing','Creativity'],
 plane:['Travel','Travel'],suitcase:['Suitcase','Travel'],map:['Map','Travel'],compass:['Compass','Travel'],
 heart:['Heart','Relationships'],pulse:['Health','Health'],medicine:['Medicine','Health'],sleep:['Sleep','Health'],
 flower:['Flower','Nature'],leaf:['Leaf','Nature'],sun:['Sun','Celestial'],planet:['Planet','Celestial'],
 coffee:['Coffee','Food'],pot:['Cooking','Food'],apple:['Nutrition','Food'],cake:['Celebration','Food'],
 laptop:['Laptop','Work'],briefcase:['Briefcase','Work'],study:['Learning','Learning'],graduation:['Study','Learning'],
 cat:['Cat','Pets'],paw:['Paw','Pets'],brush:['Beauty brush','Beauty'],mirror:['Mirror','Beauty'],bottle:['Skincare','Beauty'],comb:['Hair care','Beauty'],
 broom:['Cleaning','Home'],laundry:['Laundry','Home'],shopping:['Shopping','Money'],wallet:['Wallet','Money'],
 palette:['Art','Creativity'],music:['Music','Creativity'],camera:['Photography','Creativity'],people:['Social','Relationships'],
} as const;
export type ExtraIconName=keyof typeof extraIcons;
