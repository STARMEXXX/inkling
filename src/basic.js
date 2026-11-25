// Inkling's built-in checker. It runs locally with no network: a list of
// common misspellings plus a few simple rules. It works on its own when the
// online checker is unavailable, and fills gaps when it is.

const TYPOS = {
  // Swapped or doubled letters
  teh: 'the', hte: 'the', taht: 'that', thier: 'their', freind: 'friend', freinds: 'friends',
  recieve: 'receive', recieved: 'received', recieving: 'receiving', reciept: 'receipt',
  beleive: 'believe', beleived: 'believed', belive: 'believe', acheive: 'achieve', acheived: 'achieved',
  wierd: 'weird', peice: 'piece', seige: 'siege', concieve: 'conceive', decieve: 'deceive',
  adress: 'address', adresses: 'addresses', occured: 'occurred', occuring: 'occurring', occurence: 'occurrence',
  untill: 'until', tommorow: 'tomorrow', tomorow: 'tomorrow', tommorrow: 'tomorrow', yesturday: 'yesterday',
  begining: 'beginning', comming: 'coming', runing: 'running', geting: 'getting', stoped: 'stopped',
  planed: 'planned', writting: 'writing', writen: 'written', forgoten: 'forgotten', hapened: 'happened',
  happend: 'happened', finaly: 'finally', basicly: 'basically', realy: 'really', usualy: 'usually',
  actualy: 'actually', totaly: 'totally', definately: 'definitely', definitly: 'definitely', defintely: 'definitely',
  probaly: 'probably', propably: 'probably', immediatly: 'immediately', imediately: 'immediately',
  completly: 'completely', extremly: 'extremely', sincerly: 'sincerely', truely: 'truly', unfortunatly: 'unfortunately',
  succesful: 'successful', successfull: 'successful', sucessful: 'successful', succes: 'success', sucess: 'success',
  neccessary: 'necessary', necesary: 'necessary', neccesary: 'necessary', accomodate: 'accommodate',
  accomodation: 'accommodation', embarass: 'embarrass', embarassed: 'embarrassed', occassion: 'occasion',
  posession: 'possession', comittee: 'committee', commitee: 'committee', recomend: 'recommend', reccomend: 'recommend',
  recomendation: 'recommendation', adn: 'and', nad: 'and', jsut: 'just', becuase: 'because', becasue: 'because',
  beacuse: 'because', becuse: 'because', wich: 'which', whcih: 'which', wiht: 'with', whith: 'with',
  throught: 'through', tought: 'thought', thougth: 'thought', alredy: 'already',
  allready: 'already', aswell: 'as well', infact: 'in fact', alot: 'a lot', 
  // Common misspellings
  seperate: 'separate', seperated: 'separated', seperately: 'separately', goverment: 'government',
  enviroment: 'environment', enviromental: 'environmental', independant: 'independent', existance: 'existence',
  persistant: 'persistent', apparant: 'apparent', apparantly: 'apparently', calender: 'calendar', catagory: 'category',
  cemetary: 'cemetery', collegue: 'colleague', colleage: 'colleague', commited: 'committed', concious: 'conscious',
  curiousity: 'curiosity', dissapoint: 'disappoint', dissapointed: 'disappointed', dissapear: 'disappear',
  excercise: 'exercise', experiance: 'experience', familar: 'familiar', foriegn: 'foreign', fourty: 'forty',
  glamourous: 'glamorous', gaurd: 'guard', grammer: 'grammar', harrass: 'harass', heighth: 'height', humourous: 'humorous',
  ignorence: 'ignorance', interupt: 'interrupt', knowlege: 'knowledge', liason: 'liaison',
  libary: 'library', lisence: 'license', maintainance: 'maintenance', maintenence: 'maintenance', millenium: 'millennium',
  mispell: 'misspell', mispelled: 'misspelled', neice: 'niece', noticable: 'noticeable', oportunity: 'opportunity',
  oppurtunity: 'opportunity', paralel: 'parallel', parliment: 'parliament', pasttime: 'pastime', perseverence: 'perseverance',
  personel: 'personnel', posible: 'possible', possable: 'possible', prefered: 'preferred', privelege: 'privilege',
  priviledge: 'privilege', publically: 'publicly', questionaire: 'questionnaire', refered: 'referred', relevent: 'relevant',
  religous: 'religious', remeber: 'remember', rember: 'remember', repitition: 'repetition', restaraunt: 'restaurant',
  resturant: 'restaurant', rythm: 'rhythm', shedule: 'schedule', schedual: 'schedule', sentance: 'sentence',
  sentense: 'sentence', similiar: 'similar', simular: 'similar', speach: 'speech', strenght: 'strength', suprise: 'surprise',
  suprised: 'surprised', temperture: 'temperature', tendancy: 'tendency', threshhold: 'threshold', tounge: 'tongue',
  truley: 'truly', twelth: 'twelfth', tyrany: 'tyranny', vaccuum: 'vacuum', vehical: 'vehicle', visable: 'visible',
  wether: 'weather', whereever: 'wherever', wellcome: 'welcome', welcom: 'welcome', writeing: 'writing',
  attachement: 'attachment', arguement: 'argument', buisness: 'business', bussiness: 'business',
  busines: 'business', comunication: 'communication', comunity: 'community', developement: 'development',
  managment: 'management', manegement: 'management', prefessional: 'professional', profesional: 'professional',
  responsability: 'responsibility', availible: 'available', avaliable: 'available', avalable: 'available',
  aplication: 'application', appologize: 'apologize', apreciate: 'appreciate', appriciate: 'appreciate',
  begginer: 'beginner', benifit: 'benefit', canidate: 'candidate', choosen: 'chosen', confortable: 'comfortable',
  comfertable: 'comfortable', convinient: 'convenient', critisism: 'criticism', diffrent: 'different', diferent: 'different',
  dilema: 'dilemma', eigth: 'eighth', enought: 'enough', enouhg: 'enough', exagerate: 'exaggerate', exellent: 'excellent',
  excelent: 'excellent', explaination: 'explanation', fianlly: 'finally', fullfil: 'fulfill', garantee: 'guarantee',
  guarentee: 'guarantee', hieght: 'height', hipocrite: 'hypocrite', importent: 'important', imporant: 'important',
  intresting: 'interesting', interessting: 'interesting', langauge: 'language', languege: 'language', lenght: 'length',
  liesure: 'leisure', lightening: 'lightning', mathmatics: 'mathematics', medecine: 'medicine', minature: 'miniature',
  mischevious: 'mischievous', naturaly: 'naturally', ninty: 'ninety', obvously: 'obviously',
  ocasionally: 'occasionally', ommit: 'omit', oppinion: 'opinion', orignal: 'original', origional: 'original',
  passtime: 'pastime', peculier: 'peculiar', perfrom: 'perform', pharoah: 'pharaoh', playwrite: 'playwright',
  pleasent: 'pleasant', poeple: 'people', peopel: 'people', pepole: 'people', presense: 'presence', proffesor: 'professor',
  promiss: 'promise', psycology: 'psychology', quater: 'quarter', reccommend: 'recommend',
  rediculous: 'ridiculous', ridiculus: 'ridiculous', sargent: 'sergeant', secratary: 'secretary', secretery: 'secretary',
  sieze: 'seize', stregth: 'strength', studing: 'studying', supercede: 'supersede', supose: 'suppose', surley: 'surely',
  therefor: 'therefore', togehter: 'together', togather: 'together', tomatos: 'tomatoes', tradgedy: 'tragedy',
  vaccum: 'vacuum', 
  // Missing apostrophes
  dont: "don't", cant: "can't", wont: "won't", isnt: "isn't", arent: "aren't", doesnt: "doesn't", didnt: "didn't",
  wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't", couldnt: "couldn't",
  shouldnt: "shouldn't", wouldnt: "wouldn't", mustnt: "mustn't", neednt: "needn't", im: "I'm", ive: "I've",
  youre: "you're", youve: "you've", youll: "you'll", theyre: "they're", theyve: "they've", theyll: "they'll",
  weve: "we've", thats: "that's", whats: "what's", wheres: "where's", whos: "who's", theres: "there's", heres: "here's",
  shes: "she's", hes: "he's", itll: "it'll",
};

const PHRASES = [
  [/\b(should|could|would|must|might) of\b/gi, (m, v) => `${v} have`, 'grammar', 'Use “have”', 'After words like “should”, use “have”, not “of”.'],
  [/\b(a)\s+(?=[aeiou]\w)(?!(?:one|once|uni|use|usu|eu|uti|ufo|ewe)\w*)/gi, (m, a) => (a === 'A' ? 'An ' : 'an '), 'grammar', 'Use “an”', 'Use “an” before a vowel sound.'],
  [/\bcould care less\b/gi, () => 'couldn’t care less', 'style', 'Common phrase', 'The usual phrase is “couldn’t care less”.'],
  [/\b(the|a|an|and|to|of|in|is|it|for|on|with|that) \1\b/gi, (m, w) => w, 'grammar', 'Repeated word', 'This word appears twice in a row.'],
  [/(?<=\S) {2,}(?=\S)/g, () => ' ', 'punctuation', 'Extra space', 'There is more than one space here.'],
  [/ +([,.!?;:])(?=\s|$)/g, (m, p) => p, 'punctuation', 'Space before punctuation', 'Remove the space before this punctuation mark.'],
];

const ABBREVIATIONS = /(?:\b(?:e\.g|i\.e|etc|vs|approx|Mr|Mrs|Ms|Dr|St|No|Inc|Ltd)\.)$/i;

function matchCase(original, replacement) {
  if (original.length > 1 && original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export function checkBasic(text) {
  const issues = [];
  const add = (offset, original, replacement, category, title, message, rule) => {
    if (original === replacement) return;
    issues.push({ offset, length: original.length, original, replacements: [replacement], category, title, message, rule });
  };

  // Words
  for (const m of text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)) {
    const w = m[0];
    const lw = w.toLowerCase();
    const before = text[m.index - 1] || '';
    const after = text[m.index + w.length] || '';
    if (/[@/\\._\-:#]/.test(before) || /[@/\\_\-:]/.test(after)) continue; // emails, URLs, file names, code
    const fix = TYPOS[lw];
    if (fix) {
      const rep = fix.startsWith("I'") ? fix : matchCase(w, fix);
      add(m.index, w, rep, 'spelling', 'Spelling', `Did you mean “${rep}”?`, 'BASIC_TYPO');
    } else if (w === 'i') {
      add(m.index, w, 'I', 'grammar', 'Capitalize “I”', 'The word “I” is always capitalized.', 'BASIC_I');
    }
  }

  // Phrases and spacing
  for (const [re, fn, category, title, message] of PHRASES) {
    for (const m of text.matchAll(re)) {
      add(m.index, m[0], fn(...m), category, title, message, `BASIC_${title.toUpperCase().replace(/\W+/g, '_')}`);
    }
  }

  // Sentences should start with a capital letter
  for (const m of text.matchAll(/(?:^|[.!?]["”’)]?\s+|\n\s*)([a-z][a-z']*)/g)) {
    const word = m[1];
    const offset = m.index + m[0].length - word.length;
    const lead = text.slice(Math.max(0, offset - 12), offset).trimEnd();
    if (ABBREVIATIONS.test(lead) || /\.\.\.$/.test(lead)) continue;
    if (/[A-Z]/.test(word.slice(1))) continue; // iPhone, eBay
    const next = text[offset + word.length] || '';
    if (/[@/._:-]/.test(next) && !/\s/.test(text[offset + word.length + 1] || ' ')) continue;
    const typo = TYPOS[word];
    const fixed = typo || word;
    const cap = fixed[0].toUpperCase() + fixed.slice(1);
    if (typo) add(offset, word, cap, 'spelling', 'Spelling', `Did you mean “${cap}”?`, 'BASIC_CAPITAL');
    else add(offset, word, cap, 'punctuation', 'Capital letter', 'Start a sentence with a capital letter.', 'BASIC_CAPITAL');
  }

  // Keep the first issue where two overlap
  // At the start of a sentence, prefer the fix that also capitalizes.
  issues.sort((a, b) => a.offset - b.offset || b.length - a.length || (b.rule === 'BASIC_CAPITAL') - (a.rule === 'BASIC_CAPITAL'));
  const out = [];
  let end = -1;
  for (const i of issues) {
    if (i.offset < end) continue;
    out.push(i);
    end = i.offset + i.length;
  }
  return out;
}

// Add local findings that don't overlap anything the main checker found.
export function mergeIssues(primary, extra) {
  const taken = primary.map((i) => [i.offset, i.offset + i.length]);
  const overlaps = (i) => taken.some(([s, e]) => i.offset < e && i.offset + i.length > s);
  return [...primary, ...extra.filter((i) => !overlaps(i))].sort((a, b) => a.offset - b.offset);
}
