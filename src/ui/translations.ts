// Display-only translations. Never pass these words to the garden engine or tagger.
export type Language = 'en' | 'zh' | 'bi';
export function parseLanguage(value: string | null): Language | null {
  return value === 'en' || value === 'zh' || value === 'bi' ? value : null;
}

export const MEMORY_ZH: Record<string, string> = {
  '“You don’t have to be brave all the time.”': '“你不必每时每刻都勇敢。”',
  'Grandma Mei’s kitchen in Hangzhou, smelling of osmanthus': '梅奶奶在杭州的厨房，飘着桂花香',
  'Clair de Lune, Debussy. She played it on Sundays.': '德彪西的《月光》。她总在星期日播放。',
  'Leo and me on the night bus after graduation, 2022': '2022 年毕业后，我和利奥坐在夜班公交车上',
  '“Text me when you get home.”': '“到家后给我发个消息。”',
  'Kamakura beach at dawn, with Leo': '和利奥一起，在黎明时的镰仓海滩',
  '“We’ll figure it out.” The day I failed the exam.': '“我们会想出办法的。”那天，我考试没通过。',
  'Dad’s handwriting on a birthday card': '生日贺卡上爸爸的字迹',
  'Gymnopédie No. 1, Satie. My first winter in Tokyo.': '萨蒂的《第一号吉诺佩蒂》。我在东京的第一个冬天。',
  'The library rooftop at university': '大学图书馆的屋顶',
  '“Let it steep a little longer.” Grandma Mei taught me to make tea.': '“再泡一会儿。”梅奶奶教我沏茶。',
  'Grandma Mei’s hands folding dumplings in Hangzhou.': '在杭州，梅奶奶包饺子的双手。',
  'Grandma Mei’s balcony in Hangzhou after the rain.': '雨后，梅奶奶在杭州的阳台。',
  'The tune Grandma Mei hummed while washing cups.': '梅奶奶洗杯子时哼的那支曲子。',
  'Leo asleep against the night-bus window.': '利奥靠着夜班公交车的车窗睡着了。',
  '“We missed the last train.” Leo laughed before we started walking.': '“我们错过末班车了。”出发步行前，利奥笑了。',
  'The station outside Kamakura, waiting with Leo.': '镰仓郊外的车站，和利奥一起等待。',
  'Dad’s workbench, covered in pencil shavings.': '爸爸的工作台，上面散着铅笔屑。',
  'Dad holding the bicycle while I tried again.': '我再试一次时，爸爸扶着自行车。',
  '“Try once more.” Dad stayed beside me.': '“再试一次。”爸爸一直陪在我身旁。',
  'Rain on a train window, somewhere I no longer remember.': '火车窗上的雨，地点已经记不清了。',
  'A roadside field seen once through a train window.': '曾透过火车窗看见的一片路边田野。',
  'A melody from a shop I never found again.': '一家再也没找到的店里，传来的一段旋律。',
  'Tea with Grandma Mei in Hangzhou.': '在杭州，和梅奶奶一起喝茶。',
  'Leo and me on the library rooftop at university.': '我和利奥，在大学图书馆的屋顶上。',
};

const COPY: Record<string, string> = {
  'A life becomes a garden.': '让人生成为一座花园。',
  'Plant something you don’t want to lose.': '种下一段你不想失去的回忆。',
  'click to watch a season': '点击，观看一季', 'click anywhere to enter': '点击任意位置进入',
  'enter: plant something you don\'t want to lose': '进入：种下一段你不想失去的回忆',
  'play a season': '体验一季', 'watch a season': '观看一季', 'stop watching': '停止观看',
  'sound on': '声音已开启', 'sound off': '声音已关闭',
  'sound off: turn sound on': '声音已关闭：开启声音', 'sound on: turn sound off': '声音已开启：关闭声音',
  'a fictional example life': '一段虚构的人生',
  'a fictional life · one season to discover what holds it': '一段虚构的人生 · 用一季发现什么支撑着它',
  'let a season pass': '让一季过去', 'a season passes': '一季过去',
  'continue tending': '继续照料', 'play again': '再体验一次', 'begin your own': '开始自己的花园',
  'one light remains. tending a memory also reaches what is connected.': '只剩一束光。照料一段回忆，也会照亮与它相连的回忆。',
  'your light has found its place. let a season pass when you are ready.': '你的光已有了归处。准备好时，让一季过去。',
  'your light has found its place. a season can pass when you are ready.': '你的光已有了归处。准备好时，让一季过去。',
  'a little light for what you return to.': '为你重访的回忆，留一点光。',
  'a season passes. some moments settle into dusk.': '一季过去，一些时刻渐渐隐入暮色。',
  'you cannot keep every moment in bloom.': '你无法让每一段回忆都永远盛放。',
  'what you tend gives the garden its shape.': '你所照料的回忆，塑造了花园的模样。',
  'you tended grandma mei’s words.': '你照料了梅奶奶的话。',
  'the rooftop found a thread to leo.': '屋顶找到了一条与利奥相连的线。',
  'a new memory found its place in this life.': '一段新回忆，在这段人生中找到了归处。',
  'the garden has changed. what remains still belongs to this life.': '花园变了。留下的，依然属于这段人生。',
  'every flower is a fragment of a life: words, songs, places, photographs.': '每一朵花，都是人生的一个片段：话语、歌曲、地点、照片。',
  'memories that share someone or somewhere hold each other up.': '拥有共同人物或地点的回忆，会彼此支撑。',
  'a night bus with leo, held by every other memory of him.': '和利奥一起乘坐的夜班公交车，由关于他的其他回忆支撑着。',
  'the library rooftop. a place remembered on its own.': '图书馆屋顶，一处独自被记住的地方。',
  'what nothing else shares has nothing to lean on.': '没有与其他回忆相连的片段，也就没有可以依靠的支撑。',
  'a new memory finds what it shares.': '一段新回忆，找到了与它相通的片段。',
  'it grows into what holds it.': '它渐渐生长，融入支撑它的回忆。',
  'one light remains. to tend one memory is to choose it.': '只剩一束光。照料一段回忆，就是选择它。',
  'its light reaches everything her words are part of.': '这束光，照向所有与她的话相连的回忆。',
  'the rest is left to the season.': '其余的，就交给这一季。',
  'three weeks pass in this garden.': '花园里的三周过去了。',
  'what was held together still glows.': '那些彼此支撑的回忆，仍然发着光。',
  'this time, the rooftop is remembered with leo.': '这一次，屋顶与利奥一起被记住。',
  'a thread reaches the rooftop.': '一条线，连接到了屋顶。',
  'the light still goes to grandma mei.': '这束光，依然给了梅奶奶。',
  'three weeks pass again.': '又过了花园里的三周。',
  'the rooftop is still here, faint.': '屋顶仍在这里，成为一道淡影。',
  'no light reached it. a thread did.': '照料的光没有抵达它，一条连接却抵达了。',
  'Everything we make today is made to be kept.': '今天，我们创造的一切，都希望被留存。',
  'But memory was never a vault.': '但记忆从来不是一座保险库。',
  'It is a garden.': '它是一座花园。',
  'Nothing is erased. It only steps out of the light.': '没有什么被抹去，它只是暂时走出了光。',
  'The same life. A different choice.': '同一段人生，不同的选择。',
  'Lethe — a garden that forgets.': 'Lethe — 一座会遗忘的花园。',
  'Memories that share someone or somewhere hold each other up.': '拥有共同人物或地点的回忆，会彼此支撑。',
  'It stands alone for now. Memories that share someone or somewhere hold each other up.': '它暂时独自生长。拥有共同人物或地点的回忆，会彼此支撑。',
  '+ plant': '+ 种下回忆', 'plant': '种下', 'tend': '照料', 'let go': '放下', 'return': '重访',
  'back to the garden': '回到花园', 'cancel': '返回', 'skip': '略过',
  'sentence': '话语', 'photo': '照片', 'song': '歌曲', 'place': '地点',
  'vivid': '鲜明', 'fading': '渐淡', 'ghost': '淡影', 'lost': '隐去',
  'a fragment of this life': '这段人生的一个片段', 'choose a memory': '选择一段回忆',
  'write a memory': '写下一段回忆', 'choose a fragment to see what it could join': '选择一个片段，看看它能与哪些回忆相连',
  'What kind of memory?': '这是什么样的回忆？', 'what kind of memory': '这是什么样的回忆',
  'each kind grows a different flower': '每种回忆，都会长成不同的花', 'kind of memory': '回忆的类型',
  'plant a memory': '种下一段回忆', 'choose another fragment': '选择另一个片段',
  'choose another photograph': '选择另一张照片', 'choose a photograph': '选择一张照片',
  'the memory': '这段回忆', 'the garden': '花园', 'threads it could join': '它能连接的回忆',
  'Something you don’t want to lose…': '一段你不想失去的回忆……',
  'what is in the photograph': '照片里有什么', 'What is in the photograph': '照片里有什么',
  'a song, and where you heard it': '一首歌，以及你听到它的地方',
  'a place, and who was there': '一个地方，以及当时在场的人',
  'a sentence you want to keep': '一句你想留住的话',
  'a memory with words missing': '一段部分文字已隐去的回忆',
  'what holds you': '是什么支撑着你', 'what holds your garden': '是什么支撑着你的花园',
  'What holds your garden': '是什么支撑着你的花园',
  'Nothing holds it yet. A memory with a person or a place in it would.': '它还没有连接。关于某个人或某个地方的回忆，会带来连接。',
  'Your garden': '你的花园', 'your garden': '你的花园',
  'Your memories stay in this browser. Connections are found here, on your device. If this garden has a tagging service, only a memory’s words are sent to it, and nothing is stored.': '你的回忆留在当前浏览器中，连接在你的设备上发现。如果这座花园启用了标签服务，只有回忆的文字会发送给它，且不会被存储。',
  'export my garden': '导出我的花园', 'let the garden go': '放下这座花园',
  'Let the garden go?': '放下这座花园？', 'keep the garden': '留下花园',
  'This deletes every memory from this browser.': '这会删除当前浏览器中的所有回忆。',
  'A sentence someone said that you still hear.': '某个人说过的一句话，你至今仍能听见。',
  'Their words, as you remember them': '写下你记得的那句话',
  'A place you can still smell.': '一个你至今仍能闻到气息的地方。',
  'Where it was, and what the air held': '那个地方，以及空气中的气息',
  'A song from one particular summer.': '某个夏天里的一首歌。',
  'The song, and the summer': '那首歌，以及那个夏天',
  'A photograph you would carry out of a fire.': '一张你会从火中带走的照片。',
  'Something you told yourself on a hard day.': '在艰难的一天，你对自己说过的话。',
  'The words, as you said them': '写下你当时说的话',
  'A room you could walk through with your eyes closed.': '一间你闭着眼也能走过的房间。',
  'The room, and who was there': '那个房间，以及当时在场的人',
  'A song that belongs to one person.': '一首属于某个人的歌。',
  'The song, and who it belongs to': '那首歌，以及它属于谁',
  'arrive': '抵达', 'reset demo garden': '重新开始示例花园',
};

export const ENTITY_ZH: Record<string, string> = {
  'Grandma Mei': '梅奶奶', 'Hangzhou': '杭州', 'Leo': '利奥', 'Dad': '爸爸',
  'Kamakura': '镰仓', 'Dad’s workshop': '爸爸的工作间', 'roadside field': '路边田野',
  'university': '大学', 'Tokyo': '东京', 'Satie': '萨蒂', 'Debussy': '德彪西', 'comfort': '安慰', 'warmth': '温暖', 'tenderness': '温柔',
  'joy': '喜悦', 'care': '关怀', 'calm': '平静', 'reassurance': '安心', 'love': '爱',
  'solitude': '独处', 'home': '家',
};
const folded = new Map(Object.entries({ ...COPY, ...MEMORY_ZH, ...ENTITY_ZH }).map(([en, zh]) => [en.toLowerCase(), zh]));
const englishNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const SHORT_NAMES: Record<string, string> = {
  'the library rooftop': '图书馆屋顶', 'the library rooftop at': '图书馆屋顶',
  'grandma mei’s words': '梅奶奶的话', 'grandma mei’s kitchen in': '梅奶奶的厨房',
  'dad’s handwriting on a': '爸爸在贺卡上的字迹', 'leo and me on': '我和利奥的回忆',
  'kamakura beach at dawn,': '黎明时的镰仓海滩',
};

/** Original text is always the fallback, particularly for visitors' own memories. */
export function chinese(text: string): string {
  const direct = folded.get(text.toLowerCase());
  if (direct) return direct;
  if (/^\d+ of \d+ light$/.test(text)) return text.replace(/(\d+) of (\d+) light/, '光 $1 / $2');
  if (/^prompt \d+ of \d+$/.test(text)) return text.replace(/prompt (\d+) of (\d+)/, '第 $1 段，共 $2 段');
  if (text.startsWith('memory · ')) return `回忆 · ${chinese(text.slice(9))}`;
  if (text.startsWith('held by ')) return `由 ${text.slice(8).split(' · ').map(chinese).join(' · ')} 支撑`;
  if (text.startsWith('planted ')) return `种于 ${text.slice(8)}`;
  if (text.startsWith('not ')) return `不包含 ${chinese(text.slice(4))}`;
  const count = /^(\w+) memor(?:y|ies)$/.exec(text);
  if (count) return `${count[1] === 'no' ? 0 : englishNumbers.indexOf(count[1]) >= 0 ? englishNumbers.indexOf(count[1]) : count[1]} 段回忆`;
  const reflection = /^you (tended|returned to) (.+)\.$/.exec(text);
  if (reflection) return `你${reflection[1] === 'tended' ? '照料' : '重访'}了${chineseName(reflection[2])}。`;
  // Dynamic personal-garden whispers keep arbitrary personal text verbatim.
  const translated = text
    .replace(/(\w+) days? passed\./gi, (_, n: string) => `${englishNumbers.indexOf(n.toLowerCase()) >= 0 ? englishNumbers.indexOf(n.toLowerCase()) : n} 天过去了。`)
    .replace(/A faint thread to (.+?) still holds it\./g, (_, name: string) => `一条通向${chineseName(name)}的淡淡连接，仍支撑着它。`)
    .replace(/([^.!?]+?) still holds it\./g, (_, name: string) => `${chineseName(name.trim())}仍支撑着它。`)
    .replace(/ is drifting into fog\./g, '正渐渐隐入雾中。')
    .replace(/ is about to be lost\./g, '即将隐去。')
    .replace(/ drifted into the fog\./g, '已隐入雾中。');
  return translated === text ? text : chineseName(translated);
}

export function chineseName(text: string): string {
  const short = SHORT_NAMES[text.toLowerCase()];
  if (short) return short;
  const direct = folded.get(text.toLowerCase());
  if (direct) return direct;
  let out = text;
  for (const [en, zh] of Object.entries({ ...SHORT_NAMES, ...ENTITY_ZH }).sort((a, b) => b[0].length - a[0].length)) {
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'giu'), zh);
  }
  return out;
}

export function memoryTranslation(text: string): string | undefined { return MEMORY_ZH[text]; }
export function displayCopy(text: string, language: Language): string { return language === 'en' ? text : chinese(text); }
