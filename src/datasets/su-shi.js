/**
 * 名人数据集 - 苏轼
 *
 * 多维度资料来源，拼凑完整人物画像：
 * 1. 诗词文赋（按年份）— 作为本人"发送"的消息
 * 2. 交友互动 — 与苏辙、佛印、黄庭坚、朝云等人的往来
 * 3. 书信奏议 — 与友人的书信、给皇帝的奏折
 * 4. 史料记载 — 宋史·苏轼传等生平事件
 * 5. 后人评价 — 历代文人对苏轼的评价
 *
 * 数据来源：
 * - 《苏轼诗集》《苏轼词集》（中华书局）
 * - 《宋史·苏轼传》
 * - 《苏东坡传》林语堂
 * - 《苏轼年谱》孔凡礼
 * - 王水照《苏轼论稿》
 * - 各类学术考证论文
 */

/**
 * 将公元年份转为 Unix 时间戳（秒）
 * 宋代年份 → 负数时间戳（1970年之前）
 */
function yearToTimestamp(year, month = 6) {
  return Math.floor(Date.UTC(year - 1, month - 1, 15) / 1000);
}

export const suShi = {
  name: '苏轼',
  courtesyName: '子瞻',
  pseudonym: '东坡居士',
  birthYear: 1037,
  deathYear: 1101,
  description: '北宋文学家、书画家，唐宋八大家之一',

  data: {
    meta: {
      generatedAt: new Date().toISOString(),
      platforms: ['web', 'social', 'media', 'book'],
      totalMessages: 0,
      timeRange: { start: 0, end: 0 }
    },
    messages: [],
    contacts: []
  },

  /**
   * 构建完整的标准格式数据
   */
  build() {
    const msgs = [];

    // ====== 一、诗词文赋（本人发出的消息，按年份排列）======
    // 平台 web = 网络公开内容（诗词创作）

    // --- 早年（1037-1056）：眉山成长 ---
    msgs.push({ platform: 'web', messageId: 'poem_001', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1055), type: 'text', content: '《策别·训兵旅》（早年习作片段）\n用兵之本，在于得民；得民之本，在于得心。\n故善用兵者，先为不可胜，以待敌之可胜。' });

    msgs.push({ platform: 'web', messageId: 'poem_002', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1057, 3), type: 'text', content: '《刑赏忠厚之至论》（进士答卷节选）\n可以赏，可以无赏，赏之过乎仁；\n可以罚，可以无罚，罚之过乎义。\n过乎仁，不失为君子；过乎义，则流而入于忍人。\n故仁可过也，义不可过也。' });

    msgs.push({ platform: 'web', messageId: 'poem_003', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1061), type: 'text', content: '《和子由渑池怀旧》\n人生到处知何似，应似飞鸿踏雪泥。\n泥上偶然留指爪，鸿飞那复计东西。\n老僧已死成新塔，坏壁无由见旧题。\n往日崎岖还记否，路长人困蹇驴嘶。' });

    // --- 杭州通判时期（1071-1074）---
    msgs.push({ platform: 'web', messageId: 'poem_004', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1072), type: 'text', content: '《饮湖上初晴后雨·其二》\n水光潋滟晴方好，山色空蒙雨亦奇。\n欲把西湖比西子，淡妆浓抹总相宜。' });

    msgs.push({ platform: 'web', messageId: 'poem_005', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1073), type: 'text', content: '《六月二十七日望湖楼醉书》\n黑云翻墨未遮山，白雨跳珠乱入船。\n卷地风来忽吹散，望湖楼下水如天。' });

    // --- 密州时期（1074-1076）---
    msgs.push({ platform: 'web', messageId: 'poem_006', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1075, 1), type: 'text', content: '《江城子·乙卯正月二十日夜记梦》\n十年生死两茫茫，不思量，自难忘。\n千里孤坟，无处话凄凉。\n纵使相逢应不识，尘满面，鬓如霜。\n夜来幽梦忽还乡，小轩窗，正梳妆。\n相顾无言，惟有泪千行。\n料得年年肠断处，明月夜，短松冈。' });

    msgs.push({ platform: 'web', messageId: 'poem_007', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1075, 10), type: 'text', content: '《江城子·密州出猎》\n老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。\n为报倾城随太守，亲射虎，看孙郎。\n酒酣胸胆尚开张，鬓微霜，又何妨！\n持节云中，何日遣冯唐？\n会挽雕弓如满月，西北望，射天狼。' });

    msgs.push({ platform: 'web', messageId: 'poem_008', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1076, 8), type: 'text', content: '《水调歌头·明月几时有》\n明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。\n转朱阁，低绮户，照无眠。\n不应有恨，何事长向别时圆？\n人有悲欢离合，月有阴晴圆缺，此事古难全。\n但愿人长久，千里共婵娟。' });

    // --- 徐州时期（1077-1079）---
    msgs.push({ platform: 'web', messageId: 'poem_009', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1077), type: 'text', content: '《浣溪沙·簌簌衣巾落枣花》\n簌簌衣巾落枣花，村南村北响缫车，牛衣古柳卖黄瓜。\n酒困路长惟欲睡，日高人渴漫思茶，敲门试问野人家。' });

    // --- 黄州时期（1080-1084）：人生转折 ---
    msgs.push({ platform: 'web', messageId: 'poem_010', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1080), type: 'text', content: '《卜算子·黄州定慧院寓居作》\n缺月挂疏桐，漏断人初静。\n谁见幽人独往来，缥缈孤鸿影。\n惊起却回头，有恨无人省。\n拣尽寒枝不肯栖，寂寞沙洲冷。' });

    msgs.push({ platform: 'web', messageId: 'poem_011', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082, 3), type: 'text', content: '《定风波·莫听穿林打叶声》\n莫听穿林打叶声，何妨吟啸且徐行。\n竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。\n料峭春风吹酒醒，微冷，山头斜照却相迎。\n回首向来萧瑟处，归去，也无风雨也无晴。' });

    msgs.push({ platform: 'web', messageId: 'poem_012', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082, 7), type: 'text', content: '《念奴娇·赤壁怀古》\n大江东去，浪淘尽，千古风流人物。\n故垒西边，人道是，三国周郎赤壁。\n乱石穿空，惊涛拍岸，卷起千堆雪。\n江山如画，一时多少豪杰。\n遥想公瑾当年，小乔初嫁了，雄姿英发。\n羽扇纶巾，谈笑间，樯橹灰飞烟灭。\n故国神游，多情应笑我，早生华发。\n人生如梦，一尊还酹江月。' });

    msgs.push({ platform: 'web', messageId: 'poem_013', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082, 10), type: 'text', content: '《前赤壁赋》（节选）\n壬戌之秋，七月既望，苏子与客泛舟游于赤壁之下。\n清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章。\n少焉，月出于东山之上，徘徊于斗牛之间。\n白露横江，水光接天。纵一苇之所如，凌万顷之茫然。\n浩浩乎如冯虚御风，而不知其所止；\n飘飘乎如遗世独立，羽化而登仙。\n\n客亦知夫水与月乎？\n逝者如斯，而未尝往也；盈虚者如彼，而卒莫消长也。\n盖将自其变者而观之，则天地曾不能以一瞬；\n自其不变者而观之，则物与我皆无尽也，而又何羡乎！' });

    msgs.push({ platform: 'web', messageId: 'poem_014', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082, 12), type: 'text', content: '《后赤壁赋》（节选）\n是岁十月之望，步自雪堂，将归于临皋。\n二客从予，过黄泥之坂。霜露既降，木叶尽脱。\n人影在地，仰见明月，顾而乐之，行歌相答。\n划然长啸，草木震动，山鸣谷应，风起水涌。\n予亦悄然而悲，肃然而恐，凛乎其不可留也。\n反而登舟，放乎中流，听其所止而休焉。' });

    msgs.push({ platform: 'web', messageId: 'poem_015', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082, 11), type: 'text', content: '《临江仙·夜饮东坡醒复醉》\n夜饮东坡醒复醉，归来仿佛三更。\n家童鼻息已雷鸣，敲门都不应，倚杖听江声。\n长恨此身非我有，何时忘却营营？\n夜阑风静縠纹平，小舟从此逝，江海寄余生。' });

    msgs.push({ platform: 'web', messageId: 'poem_016', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1083), type: 'text', content: '《记承天寺夜游》\n元丰六年十月十二日夜，解衣欲睡，月色入户，欣然起行。\n念无与为乐者，遂至承天寺寻张怀民。\n怀民亦未寝，相与步于中庭。\n庭下如积水空明，水中藻荇交横，盖竹柏影也。\n何夜无月？何处无竹柏？但少闲人如吾两人者耳。' });

    // --- 汝州/登州/京城时期（1084-1085）---
    msgs.push({ platform: 'web', messageId: 'poem_017', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1084, 5), type: 'text', content: '《题西林壁》\n横看成岭侧成峰，远近高低各不同。\n不识庐山真面目，只缘身在此山中。' });

    // --- 翰林学士时期（1085-1089）---
    msgs.push({ platform: 'web', messageId: 'poem_018', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1086), type: 'text', content: '《寒食帖》（节选）\n自我来黄州，已过三寒食。年年欲惜春，春去不容惜。\n今年又苦雨，两月秋萧瑟。卧闻海棠花，泥污燕脂雪。\n暗中偷负去，夜半真有力。何殊病少年，病起头已白。' });

    // --- 杭州知州时期（1089-1091）---
    msgs.push({ platform: 'web', messageId: 'poem_019', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1090), type: 'text', content: '《赠刘景文》\n荷尽已无擎雨盖，菊残犹有傲霜枝。\n一年好景君须记，最是橙黄橘绿时。' });

    // --- 惠州时期（1094-1097）---
    msgs.push({ platform: 'web', messageId: 'poem_020', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1094, 9), type: 'text', content: '《惠州一绝》\n罗浮山下四时春，卢橘杨梅次第新。\n日啖荔枝三百颗，不辞长作岭南人。' });

    msgs.push({ platform: 'web', messageId: 'poem_021', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1095), type: 'text', content: '《蝶恋花·春景》\n花褪残红青杏小。燕子飞时，绿水人家绕。\n枝上柳绵吹又少，天涯何处无芳草！\n墙里秋千墙外道。墙外行人，墙里佳人笑。\n笑渐不闻声渐悄，多情却被无情恼。' });

    // --- 儋州时期（1097-1100）：天涯海角 ---
    msgs.push({ platform: 'web', messageId: 'poem_022', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1098), type: 'text', content: '《被酒独行遍至子云威徽先觉四黎之舍三首》（其一）\n半醒半醉问诸黎，竹刺藤梢步步迷。\n但寻牛矢觅归路，家在牛栏西复西。' });

    msgs.push({ platform: 'web', messageId: 'poem_023', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1099), type: 'text', content: '《纵笔三首》（其一）\n寂寂东坡一病翁，白须萧散满霜风。\n小儿误喜朱颜在，一笑那知是酒红。' });

    // --- 北归与辞世（1100-1101）---
    msgs.push({ platform: 'web', messageId: 'poem_024', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1100, 6), type: 'text', content: '《六月二十日夜渡海》\n参横斗转欲三更，苦雨终风也解晴。\n云散月明谁点缀？天容海色本澄清。\n空余鲁叟乘桴意，粗识轩辕奏乐声。\n九死南荒吾不恨，兹游奇绝冠平生。' });

    msgs.push({ platform: 'web', messageId: 'poem_025', chatId: 'web_创作', chatName: '创作记录', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1101, 7), type: 'text', content: '《自题金山画像》\n心似已灰之木，身如不系之舟。\n问汝平生功业，黄州惠州儋州。' });

    // ====== 二、交友互动（社交消息）======
    // 平台 social = 人际交互

    // --- 与苏辙（子由）---
    msgs.push({ platform: 'social', messageId: 'chat_001', chatId: 'social_苏辙', chatName: '与子由', sender: '苏辙', isSelf: false, timestamp: yearToTimestamp(1076, 8), type: 'text', content: '兄长，中秋之夜你在外饮酒，可曾想起千里之外的弟弟？我读你的《水调歌头》，"但愿人长久，千里共婵娟"，潸然泪下。' });
    msgs.push({ platform: 'social', messageId: 'chat_002', chatId: 'social_苏辙', chatName: '与子由', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1076, 8, 16), type: 'text', content: '子由，为兄此夜饮酒达旦，大醉。想你不在身边，故作此篇兼怀子由。人生聚散如月圆缺，不必悲也。' });
    msgs.push({ platform: 'social', messageId: 'chat_003', chatId: 'social_苏辙', chatName: '与子由', sender: '苏辙', isSelf: false, timestamp: yearToTimestamp(1079, 8), type: 'text', content: '兄长，听闻你因乌台诗案被逮入狱，我上书请求以官职赎兄之罪。望兄保重！' });
    msgs.push({ platform: 'social', messageId: 'chat_004', chatId: 'social_苏辙', chatName: '与子由', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1079, 12), type: 'text', content: '子由，狱中思汝，作诗二首寄之。与君世世为兄弟，更结来生未了因。此番若不得出，望你照顾我的家小。' });
    msgs.push({ platform: 'social', messageId: 'chat_005', chatId: 'social_苏辙', chatName: '与子由', sender: '苏辙', isSelf: false, timestamp: yearToTimestamp(1101, 7), type: 'text', content: '兄长，你病重的消息我已知悉。万里北归之路，你终究没能走到。子由在此，盼兄魂归故里。' });

    // --- 与佛印和尚 ---
    msgs.push({ platform: 'social', messageId: 'chat_006', chatId: 'social_佛印', chatName: '与佛印', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1080, 5), type: 'text', content: '佛印法师，我观你像一坨牛粪。哈哈哈哈！' });
    msgs.push({ platform: 'social', messageId: 'chat_007', chatId: 'social_佛印', chatName: '与佛印', sender: '佛印', isSelf: false, timestamp: yearToTimestamp(1080, 5), type: 'text', content: '东坡居士，贫僧观你像一尊佛。' });
    msgs.push({ platform: 'social', messageId: 'chat_008', chatId: 'social_佛印', chatName: '与佛印', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1080, 5), type: 'text', content: '……禅师境界远胜于我，我心有牛粪故见牛粪，你心如佛故见佛。受教了。' });

    // --- 与黄庭坚 ---
    msgs.push({ platform: 'social', messageId: 'chat_009', chatId: 'social_黄庭坚', chatName: '与鲁直', sender: '黄庭坚', isSelf: false, timestamp: yearToTimestamp(1086), type: 'text', content: '东坡先生，学生近日学习先生的《寒食帖》，笔法纵横跌宕，痛快淋漓。先生的书法，真乃"石压蛤蟆"也。' });
    msgs.push({ platform: 'social', messageId: 'chat_010', chatId: 'social_黄庭坚', chatName: '与鲁直', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1086), type: 'text', content: '鲁直啊，你的字清瘦如树梢挂蛇，我的字扁平如石压蛤蟆，咱们谁也别笑谁，哈哈哈！' });

    // --- 与朝云（侍妾）---
    msgs.push({ platform: 'social', messageId: 'chat_011', chatId: 'social_朝云', chatName: '与朝云', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1083), type: 'text', content: '朝云，我唱那阙"枝上柳绵吹又少，天涯何处无芳草"，你怎么就哭了？' });
    msgs.push({ platform: 'social', messageId: 'chat_012', chatId: 'social_朝云', chatName: '与朝云', sender: '朝云', isSelf: false, timestamp: yearToTimestamp(1083), type: 'text', content: '先生说"天涯何处无芳草"，分明是屡遭贬谪、身在天涯之意，朝云怎不伤悲？' });
    msgs.push({ platform: 'social', messageId: 'chat_013', chatId: 'social_朝云', chatName: '与朝云', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1096, 7), type: 'text', content: '朝云走了。她跟了我二十三年，从杭州到黄州，从黄州到惠州，到惠州便病了。我作《西江月》悼她：高情已逐晓云空，不与梨花同梦。' });

    // ====== 三、书信奏议（书籍/文件类）======
    // 平台 book = 文字著述
    msgs.push({ platform: 'book', messageId: 'letter_001', chatId: 'book_书信', chatName: '书信文集', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1079), type: 'text', content: '《答李端叔书》（节选）\n轼少年时，读书作文，专为应举而已。不幸早中式第，以此知名于世。\n及得罪以来，深自闭塞，泛舟草屦，放浪山水间，与渔樵杂处，往往为醉人所推骂，则自喜渐不为人识。' });

    msgs.push({ platform: 'book', messageId: 'letter_002', chatId: 'book_书信', chatName: '书信文集', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1082), type: 'text', content: '《答秦太虚书》（节选）\n初到黄，廪入既绝，人口不少，私甚忧之。但痛自节俭，日用不得过百五十。\n每月朔，取四千五百钱，断为三十块，挂屋梁上，平旦以画叉挑取一块，即藏去叉。仍以大竹筒别贮用不尽者，以待宾客。' });

    msgs.push({ platform: 'book', messageId: 'letter_003', chatId: 'book_书信', chatName: '书信文集', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1085), type: 'text', content: '《与章子厚书》（节选）\n轼所以得罪，其过恶未易以一二数也。平时惟子厚与子由极言见咎，苦口相药。\n今乃蒙见哀深至，如骨肉，此轼之所以感激发愤，而未知所报也。' });

    msgs.push({ platform: 'book', messageId: 'letter_004', chatId: 'book_书信', chatName: '书信文集', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1098), type: 'text', content: '《与侄孙元老书》（儋州时期节选）\n海南连岁不熟，饮食百物艰难。到州以来，又缘必要亲决公事，遂不过诲。\n某到此，凡百粗遣，既不带家属，独与幼子过南来，实以过为代也。' });

    // ====== 四、史料记载（媒体/档案）======
    // 平台 media = 史料记载
    msgs.push({ platform: 'media', messageId: 'hist_001', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1057), type: 'text', content: '【宋史·苏轼传】嘉祐二年，试礼部。主司欧阳修语梅圣俞曰："吾当避此人出一头地。"闻者始哗不厌，久乃信服。' });

    msgs.push({ platform: 'media', messageId: 'hist_002', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1061), type: 'text', content: '【宋史·苏轼传】轼见安石赞神宗以独断专任，因试进士发策，以"晋武平吴以独断而克，苻坚伐晋以独断而亡"为问。安石滋不悦，乞外任，通判杭州。' });

    msgs.push({ platform: 'media', messageId: 'hist_003', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1079, 7), type: 'text', content: '【乌台诗案】元丰二年，御史李定、舒亶、何正臣等摭轼表语及前后所作诗以为诽谤，逮赴台狱。欲置之死，太皇太后曹氏为之言，王安石亦言"安有盛世而杀才士者乎"，乃贬黄州团练副使。' });

    msgs.push({ platform: 'media', messageId: 'hist_004', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1085), type: 'text', content: '【宋史·苏轼传】哲宗立，复朝奉郎、知登州。召为礼部郎中，迁起居舍人。寻除翰林学士，兼侍读。每事必守经据古，不为苟同。' });

    msgs.push({ platform: 'media', messageId: 'hist_005', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1094), type: 'text', content: '【宋史·苏轼传】绍圣初，御史论轼掌内外制日所作词命，以为讥斥先朝。贬宁远军节度副使，惠州安置。三年，又贬琼州别驾，昌化军安置。' });

    msgs.push({ platform: 'media', messageId: 'hist_006', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1100), type: 'text', content: '【宋史·苏轼传】徽宗立，移廉州，改舒州团练副使，永州安置。更三大赦，遂提举玉局观，复朝奉郎。' });

    msgs.push({ platform: 'media', messageId: 'hist_007', chatId: 'media_宋史', chatName: '宋史·苏轼传', sender: '宋史', isSelf: false, timestamp: yearToTimestamp(1101, 7), type: 'text', content: '【宋史·苏轼传】建中靖国元年，卒于常州，年六十六。轼与弟辙，师傅父洵为文，既而得之于天。尝自谓："作文如行云流水，初无定质，但常行于所当行，止于所不可不止。"' });

    // ====== 五、后人评价 ======
    msgs.push({ platform: 'media', messageId: 'eval_001', chatId: 'media_评价', chatName: '后人评价', sender: '欧阳修', isSelf: false, timestamp: yearToTimestamp(1057), type: 'text', content: '【欧阳修】此人可谓善读书，善用书，他日必能独步天下。吾当避此人出一头地。' });

    msgs.push({ platform: 'media', messageId: 'eval_002', chatId: 'media_评价', chatName: '后人评价', sender: '黄庭坚', isSelf: false, timestamp: yearToTimestamp(1102), type: 'text', content: '【黄庭坚】东坡道人在黄州时作。语意高妙，似非吃烟火食人语。非胸中有万卷书，笔下无一点尘俗气，孰能至此！' });

    msgs.push({ platform: 'media', messageId: 'eval_003', chatId: 'media_评价', chatName: '后人评价', sender: '王安石', isSelf: false, timestamp: yearToTimestamp(1085), type: 'text', content: '【王安石】安有盛世而杀才士者乎？（乌台诗案中救苏轼）' });

    msgs.push({ platform: 'media', messageId: 'eval_004', chatId: 'media_评价', chatName: '后人评价', sender: '陆游', isSelf: false, timestamp: yearToTimestamp(1190), type: 'text', content: '【陆游】公不以一身祸福，易其忧国之心。千载之下，生气凛然。昔人谓其文章为金玉，信然。' });

    msgs.push({ platform: 'media', messageId: 'eval_005', chatId: 'media_评价', chatName: '后人评价', sender: '林语堂', isSelf: false, timestamp: yearToTimestamp(1947), type: 'text', content: '【林语堂】苏东坡是一个不可救药的乐天派、一个伟大的人道主义者、一个百姓的朋友、一个大文豪、大书法家、创新的画家、造酒试验家、一个工程师、一个憎恨清教徒主义的人、一位瑜伽修行者、一位佛教徒、一位巨儒政治家、一个皇帝的秘书、一位酒仙、一位厚道的法官、一位在政治上专唱反调的人、一个日夜徘徊者、一个诗人、一个小丑。' });

    msgs.push({ platform: 'media', messageId: 'eval_006', chatId: 'media_评价', chatName: '后人评价', sender: '钱钟书', isSelf: false, timestamp: yearToTimestamp(1980), type: 'text', content: '【钱钟书】李白以后，古代大约没有人能赶得上苏轼这种"豪放"。他在风格上的大特色是比喻的丰富、新鲜和贴切，而比喻在他的诗里屡见不穷，五花八门。' });

    // ====== 六、生活轶事 ======
    msgs.push({ platform: 'social', messageId: 'life_001', chatId: 'social_生活', chatName: '生活轶事', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1080, 3), type: 'text', content: '今日初到黄州，无俸无友，幸得徐太守善待。借居定惠院，随僧蔬食。饭后扪腹徐行，顾谓腹中诸宾客："汝辈且说，此中何物？"一妾曰"皆是文章"，一妾曰"满腹经纶"，朝云曰"学士一肚皮不合时宜"。予捧腹大笑。' });

    msgs.push({ platform: 'social', messageId: 'life_002', chatId: 'social_生活', chatName: '生活轶事', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1081), type: 'text', content: '黄州猪肉价贱如泥，富者不肯吃，贫者不解煮。我便自创一法：慢著火，少著水，火候足时它自美。每日早来打一碗，饱得自家君莫管。此"东坡肉"也。' });

    msgs.push({ platform: 'social', messageId: 'life_003', chatId: 'social_生活', chatName: '生活轶事', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1094, 10), type: 'text', content: '初到惠州，见荔枝甚喜。此间风物不恶，民风淳朴。予虽谪居，亦不改其乐。"日啖荔枝三百颗，不辞长作岭南人。"非戏言也。' });

    msgs.push({ platform: 'social', messageId: 'life_004', chatId: 'social_生活', chatName: '生活轶事', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1097, 7), type: 'text', content: '渡海至儋州，此地食无肉、病无药、居无室、出无友。然予与过儿在此，亦自有一番天地。今日抄得《汉书》一部，教当地子弟读书，颇有所得。' });

    msgs.push({ platform: 'social', messageId: 'life_005', chatId: 'social_生活', chatName: '生活轶事', sender: '苏轼', isSelf: true, timestamp: yearToTimestamp(1099), type: 'text', content: '在儋州已三年，渐习其风土。与黎族百姓往来，食芋饮水，亦自有味。今日小儿误喜我面色红润，哪知是酒红耳。"寂寂东坡一病翁，白须萧散满霜风。"' });

    // 组装标准格式
    const data = this.data;
    data.messages = msgs;
    data.meta.totalMessages = msgs.length;

    // 联系人列表
    const contacts = [
      { name: '苏辙（子由）', platform: 'social', chatId: 'social_苏辙', msgCount: 5, selfMsgCount: 3, lastActive: yearToTimestamp(1101, 7), isGroup: false },
      { name: '佛印', platform: 'social', chatId: 'social_佛印', msgCount: 3, selfMsgCount: 2, lastActive: yearToTimestamp(1080, 5), isGroup: false },
      { name: '黄庭坚（鲁直）', platform: 'social', chatId: 'social_黄庭坚', msgCount: 2, selfMsgCount: 1, lastActive: yearToTimestamp(1086), isGroup: false },
      { name: '朝云', platform: 'social', chatId: 'social_朝云', msgCount: 3, selfMsgCount: 2, lastActive: yearToTimestamp(1096, 7), isGroup: false },
      { name: '欧阳修', platform: 'media', chatId: 'media_评价', msgCount: 1, selfMsgCount: 0, lastActive: yearToTimestamp(1057), isGroup: false },
      { name: '王安石', platform: 'media', chatId: 'media_评价', msgCount: 1, selfMsgCount: 0, lastActive: yearToTimestamp(1085), isGroup: false },
      { name: '林语堂', platform: 'media', chatId: 'media_评价', msgCount: 1, selfMsgCount: 0, lastActive: yearToTimestamp(1947), isGroup: false },
      { name: '陆游', platform: 'media', chatId: 'media_评价', msgCount: 1, selfMsgCount: 0, lastActive: yearToTimestamp(1190), isGroup: false },
      { name: '钱钟书', platform: 'media', chatId: 'media_评价', msgCount: 1, selfMsgCount: 0, lastActive: yearToTimestamp(1980), isGroup: false }
    ];

    data.contacts = contacts;
    data.meta.timeRange = {
      start: Math.min(...msgs.map(m => m.timestamp)),
      end: Math.max(...msgs.map(m => m.timestamp))
    };

    return data;
  }
};
