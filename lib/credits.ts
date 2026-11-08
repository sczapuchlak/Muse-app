/**
 * Third-party content and software Muse relies on, shown in Settings → Open Source & Credits.
 * #98: `contentCredits` lists only sources whose terms require user-facing attribution (shown openly);
 * `softwareCredits` are open-source license notices that must ship with Muse (shown collapsed). Courtesy-only
 * mentions (public-domain tarot art, Open Library data) were removed. CosmyDay also stays linked beside every
 * forecast, because its terms require a link wherever the data appears.
 * Keep this list current when a library or content source is added; each entry states its license and the
 * attribution it asks for, and links to the original.
 */
export type Credit={name:string;use:string;license:string;by?:string;links:{label:string;href:string}[]};

export const contentCredits:Credit[]=[
 {name:'HeartYearning Dream Symbols Dataset',use:'Dream symbol interpretations in the Dream Encyclopedia, Decoder and Diary.',license:'Provided by HeartYearning for research and educational use; commercial use requires attribution with a link to tool.heartyearning.com.',by:'HeartYearning',links:[{label:'tool.heartyearning.com',href:'https://tool.heartyearning.com'},{label:'Dataset on GitHub',href:'https://github.com/ljt-one/dream-symbols-dataset'}]},
 {name:'CosmyDay',use:'Daily, weekly and monthly horoscope forecasts.',license:'Forecast content © CosmyDay, shown with attribution.',links:[{label:'cosmyday.com',href:'https://cosmyday.com'}]},
 {name:'Google Books',use:'Book search details and covers when adding a book.',license:'Google Books API, under Google’s API terms.',links:[{label:'Google Books',href:'https://books.google.com'}]},
 {name:'Emojibase',use:'Emoji names and search in every emoji picker.',license:'MIT License.',by:'Miles Johnson',links:[{label:'emojibase.dev',href:'https://emojibase.dev'}]},
];

export const softwareCredits:Credit[]=[
 {name:'Next.js',use:'Application framework.',license:'MIT License.',by:'Vercel',links:[{label:'nextjs.org',href:'https://nextjs.org'}]},
 {name:'React',use:'User interface library.',license:'MIT License.',by:'Meta',links:[{label:'react.dev',href:'https://react.dev'}]},
 {name:'Supabase',use:'Accounts, database and sync (supabase-js and @supabase/ssr).',license:'MIT License.',links:[{label:'supabase.com',href:'https://supabase.com'}]},
 {name:'Tiptap',use:'The Notes editor.',license:'MIT License.',links:[{label:'tiptap.dev',href:'https://tiptap.dev'}]},
 {name:'Astronomy Engine',use:'Planet and moon positions in the Cosmic Observatory.',license:'MIT License.',by:'Don Cross',links:[{label:'GitHub',href:'https://github.com/cosinekitty/astronomy'}]},
 {name:'Recharts',use:'Charts in Insights.',license:'MIT License.',links:[{label:'recharts.org',href:'https://recharts.org'}]},
 {name:'Lucide icons',use:'Sidebar and app icons.',license:'ISC License (some icons MIT, from Feather).',links:[{label:'lucide.dev',href:'https://lucide.dev'}]},
 {name:'Tailwind CSS',use:'Styling toolkit.',license:'MIT License.',links:[{label:'tailwindcss.com',href:'https://tailwindcss.com'}]},
];
