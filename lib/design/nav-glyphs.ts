/**
 * Every page's tab bar shares one look (Stephanie, Nov 13: the Fortune & Fun pills, "this is pretty, LOVE"): a small
 * gradient tile with a white glyph beside each tab's name. One glyph and tone per tab, namespaced by page, so the same
 * id on two pages ("overview", "mood", "atlas") can still differ. Neighbouring tabs never share a tone.
 */
type Art={icon:string;tone:1|2|3|4|5|6|7|8};
const a=(icon:string,tone:Art['tone']):Art=>({icon,tone});
export const navGlyphs:Record<string,Art>={
 'planner:tasks':a('checklist',1),'planner:intentions':a('seedling',3),'planner:agenda':a('calendar',5),'planner:reflections':a('quill',7),
 'envision:aspirations':a('constellation',6),'envision:vision-boards':a('palette',4),'envision:bucket':a('map',2),
 'money:overview':a('wallet',1),'money:paychecks':a('coins',3),'money:spending':a('receipt',2),'money:recurring':a('repeat',5),'money:cards':a('creditcard',6),'money:categories':a('pie',4),
 'insights:overview':a('bars',1),'insights:plans':a('checklist',3),'insights:mood':a('smile',2),'insights:money':a('coins',4),'insights:nourish':a('pulse',5),'insights:astrology':a('planet',7),'insights:collections':a('openbook',6),
 'mindspace:board':a('lightbulb',4),'mindspace:lists':a('list',1),
 'wellness:mood':a('smile',2),'wellness:goals':a('target',1),'wellness:plan':a('utensils',4),'wellness:grocery':a('basket',3),
 'books:dashboard':a('pie',5),'books:library':a('openbook',2),'books:atlas':a('globe',6),
 'tarot:table':a('spread',6),'tarot:grimoire':a('scroll',4),'tarot:journal':a('journal',2),
 'dreams:diary':a('journal',5),'dreams:decoder':a('key',7),'dreams:encyclopedia':a('openbook',3),'dreams:atlas':a('map',6),
 'cosmic:forecast':a('sun',4),'cosmic:chart':a('wheel',7),'cosmic:library':a('openbook',2),'cosmic:calendar':a('calendar',5),'cosmic:journal':a('journal',6),
 'fun:side-quests':a('compass',3),'fun:cookie':a('cookie',4),'fun:oracle':a('crystal',1),'fun:prophecy':a('letter',6),'fun:curiosity':a('cabinet',2),'fun:collection':a('keepsake',5),
};
export const navArt=(ns:string,id:string):Art|null=>navGlyphs[`${ns}:${id}`]??null;
