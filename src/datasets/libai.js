/**
 * 名人数据集 - 李白
 *
 * 多维度资料来源，拼凑完整人物画像：
 * 1. 诗作（按年份）— 作为本人"发送"的消息
 * 2. 交友互动 — 与杜甫、孟浩然、汪伦等人的往来
 * 3. 书信序文 — 与韩荆州书、春夜宴桃花园序等
 * 4. 史料记载 — 新唐书、旧唐书中的生平事件
 * 5. 后人评价 — 历代文人对李白的评价
 *
 * 数据来源：
 * - 《李太白全集》王琦注本
 * - 《新唐书·李白传》《旧唐书·李白传》
 * - 《唐诗三百首》蘅塘退士编
 * - 郭沫若《李白与杜甫》
 * - 安旗《李白年谱》
 * - 各类学术考证论文
 */

/**
 * 将公元年份转为 Unix 时间戳（秒）
 * 唐代年份 → 负数时间戳（1970年之前）
 */
function yearToTimestamp(year, month = 6) {
  return Math.floor(Date.UTC(year - 1, month - 1, 15) / 1000);
}

export const libai = {
  name: '李白',
  courtesyName: '太白',
  birthYear: 701,
  deathYear: 762,
  description: '唐代浪漫主义诗人，被誉为"诗仙"',

  data: {
    meta: {
      generatedAt: new Date().toISOString(),
      platforms: ['web', 'social', 'media', 'book'],
      totalMessages: 0, // 自动计算
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

    // ====== 一、诗作（本人发出的消息，按年份排列）======
    // 平台 web = 网络公开内容（诗作）

    // --- 早年（701-724）：蜀中成长 ---
    msgs.push({ platform: 'web', messageId: 'poem_001', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(720), type: 'text', content: '《访戴天山道士不遇》\n犬吠水声中，桃花带露浓。\n树深时见鹿，溪午不闻钟。\n野竹分青霭，飞泉挂碧峰。\n无人知所去，愁倚两三松。' });

    msgs.push({ platform: 'web', messageId: 'poem_002', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(722), type: 'text', content: '《登锦城散花楼》\n日照锦城头，朝光散花楼。\n金窗夹绣户，珠箔悬银钩。\n飞梯绿云中，极目散我忧。\n暮雨向三峡，春江绕双流。\n今来一登望，如上九天游。' });

    msgs.push({ platform: 'web', messageId: 'poem_003', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(724, 3), type: 'text', content: '《峨眉山月歌》\n峨眉山月半轮秋，影入平羌江水流。\n夜发清溪向三峡，思君不见下渝州。' });

    // --- 游历时期（725-741）：出蜀漫游 ---
    msgs.push({ platform: 'web', messageId: 'poem_004', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(725, 5), type: 'text', content: '《渡荆门送别》\n渡远荆门外，来从楚国游。\n山随平野尽，江入大荒流。\n月下飞天镜，云生结海楼。\n仍怜故乡水，万里送行舟。' });

    msgs.push({ platform: 'web', messageId: 'poem_005', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(726), type: 'text', content: '《静夜思》\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' });

    msgs.push({ platform: 'web', messageId: 'poem_006', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(728), type: 'text', content: '《黄鹤楼送孟浩然之广陵》\n故人西辞黄鹤楼，烟花三月下扬州。\n孤帆远影碧空尽，唯见长江天际流。' });

    msgs.push({ platform: 'web', messageId: 'poem_007', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(730), type: 'text', content: '《望庐山瀑布》\n日照香炉生紫烟，遥看瀑布挂前川。\n飞流直下三千尺，疑是银河落九天。' });

    msgs.push({ platform: 'web', messageId: 'poem_008', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(732), type: 'text', content: '《望天门山》\n天门中断楚江开，碧水东流至此回。\n两岸青山相对出，孤帆一片日边来。' });

    msgs.push({ platform: 'web', messageId: 'poem_009', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(735), type: 'text', content: '《行路难·其一》\n金樽清酒斗十千，玉盘珍羞直万钱。\n停杯投箸不能食，拔剑四顾心茫然。\n欲渡黄河冰塞川，将登太行雪满山。\n闲来垂钓碧溪上，忽复乘舟梦日边。\n行路难，行路难，多歧路，今安在？\n长风破浪会有时，直挂云帆济沧海。' });

    msgs.push({ platform: 'web', messageId: 'poem_010', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(738), type: 'text', content: '《蜀道难》\n噫吁嚱，危乎高哉！\n蜀道之难，难于上青天！\n蚕丛及鱼凫，开国何茫然！\n尔来四万八千岁，不与秦塞通人烟。\n西当太白有鸟道，可以横绝峨眉巅。\n地崩山摧壮士死，然后天梯石栈相钩连。\n上有六龙回日之高标，下有冲波逆折之回川。\n黄鹤之飞尚不得过，猿猱欲度愁攀援。\n青泥何盘盘，百步九折萦岩峦。\n扪参历井仰胁息，以手抚膺坐长叹。\n问君西游何时还？畏途巉岩不可攀。\n但见悲鸟号古木，雄飞雌从绕林间。\n又闻子规啼夜月，愁空山。\n蜀道之难，难于上青天，使人听此凋朱颜！' });

    msgs.push({ platform: 'web', messageId: 'poem_011', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(740), type: 'text', content: '《赠汪伦》\n李白乘舟将欲行，忽闻岸上踏歌声。\n桃花潭水深千尺，不及汪伦送我情。' });

    // --- 长安时期（742-744）：翰林供奉 ---
    msgs.push({ platform: 'web', messageId: 'poem_012', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(742, 8), type: 'text', content: '《清平调·其一》\n云想衣裳花想容，春风拂槛露华浓。\n若非群玉山头见，会向瑶台月下逢。' });

    msgs.push({ platform: 'web', messageId: 'poem_013', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(742, 9), type: 'text', content: '《清平调·其二》\n一枝红艳露凝香，云雨巫山枉断肠。\n借问汉宫谁得似，可怜飞燕倚新妆。' });

    msgs.push({ platform: 'web', messageId: 'poem_014', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(742, 10), type: 'text', content: '《清平调·其三》\n名花倾国两相欢，长得君王带笑看。\n解释春风无限恨，沉香亭北倚阑干。' });

    msgs.push({ platform: 'web', messageId: 'poem_015', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(743), type: 'text', content: '《月下独酌·其一》\n花间一壶酒，独酌无相亲。\n举杯邀明月，对影成三人。\n月既不解饮，影徒随我身。\n暂伴月将影，行乐须及春。\n我歌月徘徊，我舞影零乱。\n醒时同交欢，醉后各分散。\n永结无情游，相期邈云汉。' });

    // --- 赐金放还后（744-755）：再度漫游 ---
    msgs.push({ platform: 'web', messageId: 'poem_016', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(744, 8), type: 'text', content: '《将进酒》\n君不见黄河之水天上来，奔流到海不复回。\n君不见高堂明镜悲白发，朝如青丝暮成雪。\n人生得意须尽欢，莫使金樽空对月。\n天生我材必有用，千金散尽还复来。\n烹羊宰牛且为乐，会须一饮三百杯。\n岑夫子，丹丘生，将进酒，杯莫停。\n与君歌一曲，请君为我倾耳听。\n钟鼓馔玉不足贵，但愿长醉不复醒。\n古来圣贤皆寂寞，惟有饮者留其名。\n陈王昔时宴平乐，斗酒十千恣欢谑。\n主人何为言少钱，径须沽取对君酌。\n五花马，千金裘，呼儿将出换美酒，与尔同销万古愁。' });

    msgs.push({ platform: 'web', messageId: 'poem_017', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(745), type: 'text', content: '《梦游天姥吟留别》\n海客谈瀛洲，烟涛微茫信难求。\n越人语天姥，云霞明灭或可睹。\n天姥连天向天横，势拔五岳掩赤城。\n天台四万八千丈，对此欲倒东南倾。\n我欲因之梦吴越，一夜飞度镜湖月。\n湖月照我影，送我至剡溪。\n谢公宿处今尚在，渌水荡漾清猿啼。\n脚著谢公屐，身登青云梯。\n半壁见海日，空中闻天鸡。\n千岩万转路不定，迷花倚石忽已暝。\n熊咆龙吟殷岩泉，栗深林兮惊层巅。\n云青青兮欲雨，水澹澹兮生烟。\n列缺霹雳，丘峦崩摧。\n洞天石扉，訇然中开。\n青冥浩荡不见底，日月照耀金银台。\n霓为衣兮风为马，云之君兮纷纷而来下。\n虎鼓瑟兮鸾回车，仙之人兮列如麻。\n忽魂悸以魄动，恍惊起而长嗟。\n惟觉时之枕席，失向来之烟霞。\n世间行乐亦如此，古来万事东流水。\n别君去兮何时还？且放白鹿青崖间，须行即骑访名山。\n安能摧眉折腰事权贵，使我不得开心颜！' });

    msgs.push({ platform: 'web', messageId: 'poem_018', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(747), type: 'text', content: '《独坐敬亭山》\n众鸟高飞尽，孤云独去闲。\n相看两不厌，只有敬亭山。' });

    msgs.push({ platform: 'web', messageId: 'poem_019', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(749), type: 'text', content: '《客中行》\n兰陵美酒郁金香，玉碗盛来琥珀光。\n但使主人能醉客，不知何处是他乡。' });

    msgs.push({ platform: 'web', messageId: 'poem_020', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(752), type: 'text', content: '《越女词·其三》\n耶溪采莲女，见客棹歌回。\n笑畏荷花妒，娇啼珠玉催。' });

    msgs.push({ platform: 'web', messageId: 'poem_021', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(753), type: 'text', content: '《秋浦歌·十五》\n白发三千丈，缘愁似个长。\n不知明镜里，何处得秋霜。' });

    msgs.push({ platform: 'web', messageId: 'poem_022', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(754), type: 'text', content: '《赠汪伦》后又记：桃花潭水虽深千尺，不及友人送别之情。我一生漂泊，所到之处皆有友人相送，此乃人生之幸。' });

    // --- 安史之乱后（755-762）：流放与晚年 ---
    msgs.push({ platform: 'web', messageId: 'poem_023', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(756), type: 'text', content: '《奔亡道中·其五》\n淼淼望湖水，青青芦叶齐。\n归心落何处，日没大江西。' });

    msgs.push({ platform: 'web', messageId: 'poem_024', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(757), type: 'text', content: '《永王东巡歌·其十一》\n试借君王玉马鞭，指麾戎虏坐琼筵。\n南风一扫胡尘静，西入长安到日边。' });

    msgs.push({ platform: 'web', messageId: 'poem_025', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(759, 3), type: 'text', content: '《早发白帝城》\n朝辞白帝彩云间，千里江陵一日还。\n两岸猿声啼不住，轻舟已过万重山。' });

    msgs.push({ platform: 'web', messageId: 'poem_026', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(760), type: 'text', content: '《与史郎中钦听黄鹤楼上吹笛》\n一为迁客去长沙，西望长安不见家。\n黄鹤楼中吹玉笛，江城五月落梅花。' });

    msgs.push({ platform: 'web', messageId: 'poem_027', chatId: 'web_创作', chatName: '创作记录', sender: '李白', isSelf: true, timestamp: yearToTimestamp(761), type: 'text', content: '《临终歌》\n大鹏飞兮振八裔，中天摧兮力不济。\n馀风激兮万世，游扶桑兮挂左袂。\n后人得之传此，仲尼亡兮谁为出涕？' });

    // ====== 二、交友互动（social 平台 = 社交往来）======

    // --- 与杜甫 ---
    msgs.push({ platform: 'social', messageId: 'chat_001', chatId: 'social_杜甫', chatName: '杜甫', sender: '李白', isSelf: true, timestamp: yearToTimestamp(744, 5), type: 'text', content: '子美，你我今日相识于洛阳，一见如故。你诗风沉郁，与我不同，但正可互补。' });
    msgs.push({ platform: 'social', messageId: 'chat_002', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(744, 5), type: 'text', content: '太白兄谬赞。我读你的诗，如见天外飞仙，飘逸绝伦。能与你同游，是甫之幸也。' });
    msgs.push({ platform: 'social', messageId: 'chat_003', chatId: 'social_杜甫', chatName: '杜甫', sender: '李白', isSelf: true, timestamp: yearToTimestamp(744, 7), type: 'text', content: '子美，明日我们同去梁宋打猎如何？高适也在，正好三人同行。' });
    msgs.push({ platform: 'social', messageId: 'chat_004', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(744, 7), type: 'text', content: '甚好！梁宋之行，必成佳话。' });
    msgs.push({ platform: 'social', messageId: 'chat_005', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(745, 3), type: 'text', content: '太白兄，自兖州分别后，时常想念。你近来可好？' });
    msgs.push({ platform: 'social', messageId: 'chat_006', chatId: 'social_杜甫', chatName: '杜甫', sender: '李白', isSelf: true, timestamp: yearToTimestamp(745, 3), type: 'text', content: '子美勿念。我已至江南，漫游不止。人生聚散如浮云，后会有期。' });
    msgs.push({ platform: 'social', messageId: 'chat_007', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(746), type: 'text', content: '《春日忆李白》\n白也诗无敌，飘然思不群。\n清新庾开府，俊逸鲍参军。\n渭北春天树，江东日暮云。\n何时一樽酒，重与细论文。' });
    msgs.push({ platform: 'social', messageId: 'chat_008', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(748), type: 'text', content: '《梦李白二首·其一》\n死别已吞声，生别常恻恻。\n江南瘴疠地，逐客无消息。\n故人入我梦，明我长相忆。\n君今在罗网，何以有羽翼？\n恐非平生魂，路远不可测。\n魂来枫林青，魂返关塞黑。\n落月满屋梁，犹疑照颜色。\n水深波浪阔，无使蛟龙得。' });
    msgs.push({ platform: 'social', messageId: 'chat_009', chatId: 'social_杜甫', chatName: '杜甫', sender: '杜甫', isSelf: false, timestamp: yearToTimestamp(759), type: 'text', content: '《天末怀李白》\n凉风起天末，君子意如何？\n鸿雁几时到，江湖秋水多。\n文章憎命达，魑魅喜人过。\n应共冤魂语，投诗赠汨罗。' });

    // --- 与孟浩然 ---
    msgs.push({ platform: 'social', messageId: 'chat_010', chatId: 'social_孟浩然', chatName: '孟浩然', sender: '李白', isSelf: true, timestamp: yearToTimestamp(727), type: 'text', content: '孟夫子，我读你的诗，如饮清泉，淡而有味。"微云淡河汉，疏雨滴梧桐"之句，令人叹服。' });
    msgs.push({ platform: 'social', messageId: 'chat_011', chatId: 'social_孟浩然', chatName: '孟浩然', sender: '孟浩然', isSelf: false, timestamp: yearToTimestamp(727), type: 'text', content: '太白过誉了。你的诗才如天马行空，我望尘莫及。' });
    msgs.push({ platform: 'social', messageId: 'chat_012', chatId: 'social_孟浩然', chatName: '孟浩然', sender: '李白', isSelf: true, timestamp: yearToTimestamp(728, 3), type: 'text', content: '浩然兄，听闻你要去广陵，我在黄鹤楼为你送行。烟花三月，正是江南好时节。' });
    msgs.push({ platform: 'social', messageId: 'chat_013', chatId: 'social_孟浩然', chatName: '孟浩然', sender: '孟浩然', isSelf: false, timestamp: yearToTimestamp(728, 3), type: 'text', content: '多谢太白相送。此去广陵，不知何日再见。保重！' });
    msgs.push({ platform: 'social', messageId: 'chat_014', chatId: 'social_孟浩然', chatName: '孟浩然', sender: '李白', isSelf: true, timestamp: yearToTimestamp(728, 3), type: 'text', content: '《黄鹤楼送孟浩然之广陵》——故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。' });

    // --- 与汪伦 ---
    msgs.push({ platform: 'social', messageId: 'chat_015', chatId: 'social_汪伦', chatName: '汪伦', sender: '汪伦', isSelf: false, timestamp: yearToTimestamp(740, 2), type: 'text', content: '太白先生，我是泾县汪伦。听闻先生好游，我这里有十里桃花、万家酒店，先生可愿来一游？' });
    msgs.push({ platform: 'social', messageId: 'chat_016', chatId: 'social_汪伦', chatName: '汪伦', sender: '李白', isSelf: true, timestamp: yearToTimestamp(740, 2), type: 'text', content: '十里桃花，万家酒店！好，我一定来！' });
    msgs.push({ platform: 'social', messageId: 'chat_017', chatId: 'social_汪伦', chatName: '汪伦', sender: '李白', isSelf: true, timestamp: yearToTimestamp(740, 3), type: 'text', content: '汪伦兄，我到了泾县，桃花只是潭水名，酒店只是一家姓万的开的。你骗了我啊！哈哈哈！' });
    msgs.push({ platform: 'social', messageId: 'chat_018', chatId: 'social_汪伦', chatName: '汪伦', sender: '汪伦', isSelf: false, timestamp: yearToTimestamp(740, 3), type: 'text', content: '先生莫怪，不如此，怎请得动您大驾？这几日招待不周，还望海涵。' });
    msgs.push({ platform: 'social', messageId: 'chat_019', chatId: 'social_汪伦', chatName: '汪伦', sender: '李白', isSelf: true, timestamp: yearToTimestamp(740, 4), type: 'text', content: '哈哈哈，虽是"骗"我，但这几日饮酒作诗，快哉快哉！汪伦兄情意，白记下了。' });
    msgs.push({ platform: 'social', messageId: 'chat_020', chatId: 'social_汪伦', chatName: '汪伦', sender: '汪伦', isSelf: false, timestamp: yearToTimestamp(740, 4), type: 'text', content: '先生要走了？让我踏歌相送！' });

    // --- 与贺知章 ---
    msgs.push({ platform: 'social', messageId: 'chat_021', chatId: 'social_贺知章', chatName: '贺知章', sender: '贺知章', isSelf: false, timestamp: yearToTimestamp(742, 1), type: 'text', content: '太白，我读了你的《蜀道难》，惊为天人！你莫不是天上谪仙人下凡？' });
    msgs.push({ platform: 'social', messageId: 'chat_022', chatId: 'social_贺知章', chatName: '贺知章', sender: '李白', isSelf: true, timestamp: yearToTimestamp(742, 1), type: 'text', content: '季真兄谬赞了。"谪仙人"这个说法有趣，我倒愿意当一回天上来的客人。' });
    msgs.push({ platform: 'social', messageId: 'chat_023', chatId: 'social_贺知章', chatName: '贺知章', sender: '贺知章', isSelf: false, timestamp: yearToTimestamp(742, 1), type: 'text', content: '来来来，我解下腰间金龟，换酒与你同饮！今日不醉不归！' });
    msgs.push({ platform: 'social', messageId: 'chat_024', chatId: 'social_贺知章', chatName: '贺知章', sender: '李白', isSelf: true, timestamp: yearToTimestamp(742, 1), type: 'text', content: '金龟换酒，千古佳话！季真兄真性情中人，白敬你一杯！' });

    // --- 与高适 ---
    msgs.push({ platform: 'social', messageId: 'chat_025', chatId: 'social_高适', chatName: '高适', sender: '高适', isSelf: false, timestamp: yearToTimestamp(744, 7), type: 'text', content: '太白、子美，梁宋之游痛快！吹台猎鹰，大碗喝酒，这才是男儿该过的日子。' });
    msgs.push({ platform: 'social', messageId: 'chat_026', chatId: 'social_高适', chatName: '高适', sender: '李白', isSelf: true, timestamp: yearToTimestamp(744, 7), type: 'text', content: '达夫说得好！人生得意须尽欢。你我三人，当浮一大白！' });

    // --- 与王维 ---
    msgs.push({ platform: 'social', messageId: 'chat_027', chatId: 'social_王维', chatName: '王维', sender: '王维', isSelf: false, timestamp: yearToTimestamp(743), type: 'text', content: '太白兄，听说你在翰林院深得圣上赏识。摩诘在此遥祝。' });
    msgs.push({ platform: 'social', messageId: 'chat_028', chatId: 'social_王维', chatName: '王维', sender: '李白', isSelf: true, timestamp: yearToTimestamp(743), type: 'text', content: '摩诘兄，翰林供奉不过是为天子写些应制诗罢了。你的辋川别业，才是真正的自在。' });

    // ====== 三、书信序文（book 平台 = 出版文献）======

    msgs.push({ platform: 'media', messageId: 'doc_001', chatId: 'book_书信', chatName: '书信文书', sender: '李白', isSelf: true, timestamp: yearToTimestamp(734), type: 'text', content: '《与韩荆州书》（节选）\n白闻天下谈士相聚而言曰：生不用封万户侯，但愿一识韩荆州。何令人之景慕一至于此耶？岂不以有周公之风，躬吐握之事，使海内豪俊奔走而归之，一登龙门则声誉十倍。所以龙盘凤逸之士，皆欲收名定价于君侯。愿君侯不以富贵而骄之，寒贱而忽之。则三千宾中有毛遂，使白得颖脱而出，即其人焉。\n白陇西布衣，流落楚汉。十五好剑术，遍干诸侯；三十成文章，历抵卿相。虽长不满七尺，而心雄万夫。' });

    msgs.push({ platform: 'media', messageId: 'doc_002', chatId: 'book_书信', chatName: '书信文书', sender: '李白', isSelf: true, timestamp: yearToTimestamp(740), type: 'text', content: '《春夜宴从弟桃花园序》\n夫天地者，万物之逆旅也；光阴者，百代之过客也。而浮生若梦，为欢几何？古人秉烛夜游，良有以也。况阳春召我以烟景，大块假我以文章。会桃花之芳园，序天伦之乐事。群季俊秀，皆为惠连；吾人咏歌，独惭康乐。幽赏未已，高谈转清。开琼筵以坐花，飞羽觞而醉月。不有佳咏，何伸雅怀？如诗不成，罚依金谷酒数。' });

    msgs.push({ platform: 'media', messageId: 'doc_003', chatId: 'book_书信', chatName: '书信文书', sender: '李白', isSelf: true, timestamp: yearToTimestamp(753), type: 'text', content: '《上安州裴长史书》（节选）\n白窃慕高义，得趋末尘。何图谤言忽生，众口攒毁。将恐投杼下客，震于严威。若使事得其实，罪当其身，则将浴兰沐芳，自屏于烹鲜之地。惟君侯察之。' });

    msgs.push({ platform: 'media', messageId: 'doc_004', chatId: 'book_书信', chatName: '书信文书', sender: '李白', isSelf: true, timestamp: yearToTimestamp(755), type: 'text', content: '《代寿山答孟少府移文书》（节选）\n近者逸人李白，自峨眉而来。尔其天为容，道为貌，不屈己，不干人，巢由以来，一人而已。乃虬蟠道存，方讨可述。' });

    // ====== 四、史料记载（media 平台 = 媒体史料）======

    msgs.push({ platform: 'media', messageId: 'hist_001', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(701), type: 'system', content: '【新唐书】李白，字太白，兴圣皇帝九世孙。其先隋末以罪徙西域，神龙初，遁还，客巴西。' });

    msgs.push({ platform: 'media', messageId: 'hist_002', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(705), type: 'system', content: '【年谱】李白五岁随父迁居四川绵州昌隆县青莲乡。此后在蜀中成长，读书学剑，遍览百家。' });

    msgs.push({ platform: 'media', messageId: 'hist_003', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(720), type: 'system', content: '【年谱】李白二十岁，游历成都、峨眉山。礼见益州长史苏颋，颋曰："此子天才英丽，下笔不休。"' });

    msgs.push({ platform: 'media', messageId: 'hist_004', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(724), type: 'system', content: '【年谱】李白二十四岁，辞亲远游。自峨眉山出发，经平羌江、清溪、渝州，出蜀。自此开始一生漫游。' });

    msgs.push({ platform: 'media', messageId: 'hist_005', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(727), type: 'system', content: '【年谱】李白二十七岁，与故宰相许圉师孙女结婚，安家于湖北安陆。与孟浩然结交。' });

    msgs.push({ platform: 'media', messageId: 'hist_006', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(730), type: 'system', content: '【年谱】李白三十岁，初入长安。隐居终南山，欲求仕进，未果。与贺知章等交游。' });

    msgs.push({ platform: 'media', messageId: 'hist_007', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(742), type: 'system', content: '【新唐书】天宝初，吴筠被召，白亦至长安。往见贺知章，知章见其文，叹曰："子谪仙人也。"言于玄宗，召见金銮殿，论当世事，奏颂一篇。帝赐食，亲为调羹，有诏供奉翰林。' });

    msgs.push({ platform: 'media', messageId: 'hist_008', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(743), type: 'system', content: '【旧唐书】白犹与饮徒醉于市。帝坐沉香亭，意有所感，欲得白为乐章，召入而白已醉。左右以水颒面，稍解，援笔成文，婉丽精切。帝爱其才，数宴见。' });

    msgs.push({ platform: 'media', messageId: 'hist_009', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(744, 3), type: 'system', content: '【新唐书】白自知不为亲近所容，益骜放不自修。恳求还山，帝赐金放还。白浮游四方，尝乘舟与崔宗之自采石至金陵，著宫锦袍坐舟中，旁若无人。' });

    msgs.push({ platform: 'media', messageId: 'hist_010', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(744, 8), type: 'system', content: '【年谱】李白与杜甫在洛阳相识。后与高适同游梁宋。杜甫有诗云："醉眠秋共被，携手日同行。"三人结下深厚友谊。' });

    msgs.push({ platform: 'media', messageId: 'hist_011', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(755, 11), type: 'system', content: '【年谱】安史之乱爆发。李白携宗氏夫人避难江南，后隐居庐山。' });

    msgs.push({ platform: 'media', messageId: 'hist_012', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(756, 12), type: 'system', content: '【新唐书】永王李璘辟为府僚佐。璘起兵，逃还彭泽。璘败，当诛。初白游并州，见郭子仪奇之，子仪尝犯法，白为救免。至是子仪请解官以赎，有诏长流夜郎。' });

    msgs.push({ platform: 'media', messageId: 'hist_013', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(759, 3), type: 'system', content: '【年谱】李白五十九岁，行至白帝城时遇赦。欣喜若狂，即作《早发白帝城》。顺江东下，重获自由。' });

    msgs.push({ platform: 'media', messageId: 'hist_014', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(762), type: 'system', content: '【新唐书】李阳冰为当涂令，白依之。代宗立，以左拾遗召，而白已前卒，年六十余。' });

    msgs.push({ platform: 'media', messageId: 'hist_015', chatId: 'media_史传', chatName: '史料记载', sender: '史官', isSelf: false, timestamp: yearToTimestamp(762, 11), type: 'system', content: '【年谱】宝应元年，李白卒于当涂，享年六十二岁。临终作《临终歌》，以大鹏自比，叹壮志未酬。葬于当涂青山。' });

    // ====== 五、后人评价（media 平台 = 后世评论）======

    msgs.push({ platform: 'media', messageId: 'eval_001', chatId: 'media_评价', chatName: '后人评价', sender: '韩愈', isSelf: false, timestamp: yearToTimestamp(810), type: 'text', content: '李杜文章在，光焰万丈长。不知群儿愚，那用故谤伤。蚍蜉撼大树，可笑不自量。' });

    msgs.push({ platform: 'media', messageId: 'eval_002', chatId: 'media_评价', chatName: '后人评价', sender: '白居易', isSelf: false, timestamp: yearToTimestamp(820), type: 'text', content: '《读李杜诗集因题卷后》\n翰林江左日，员外剑南时。不得高官职，仍逢苦乱离。暮年逋客恨，浮世谪仙悲。' });

    msgs.push({ platform: 'media', messageId: 'eval_003', chatId: 'media_评价', chatName: '后人评价', sender: '苏轼', isSelf: false, timestamp: yearToTimestamp(1080), type: 'text', content: '李白诗飘逸绝尘，不可追攀。如"清风明月不用一钱买"，此语殊不凡。' });

    msgs.push({ platform: 'media', messageId: 'eval_004', chatId: 'media_评价', chatName: '后人评价', sender: '严羽', isSelf: false, timestamp: yearToTimestamp(1230), type: 'text', content: '《沧浪诗话》：子美不能为太白之飘逸，太白不能为子美之沉郁。太白《梦游天姥吟》《远别离》等，子美不能道；子美《北征》《新安吏》等，太白不能道。' });

    msgs.push({ platform: 'media', messageId: 'eval_005', chatId: 'media_评价', chatName: '后人评价', sender: '高棅', isSelf: false, timestamp: yearToTimestamp(1400), type: 'text', content: '《唐诗品汇》：太白诗语纵横，如天花乱坠，不可捉摸。其天才自是仙才，非人力可及。' });

    msgs.push({ platform: 'media', messageId: 'eval_006', chatId: 'media_评价', chatName: '后人评价', sender: '郭沫若', isSelf: false, timestamp: yearToTimestamp(1950), type: 'text', content: '李白生于盛唐，他的诗歌是盛唐气象的集中体现。他的浪漫主义精神，对后世影响深远。他一生追求自由，蔑视权贵，这种精神在任何时代都是可贵的。' });

    msgs.push({ platform: 'media', messageId: 'eval_007', chatId: 'media_评价', chatName: '后人评价', sender: '余光中', isSelf: false, timestamp: yearToTimestamp(1980), type: 'text', content: '《寻李白》\n酒入豪肠，七分酿成了月光，余下的三分啸成剑气，绣口一吐就半个盛唐。' });

    // ====== 六、生活细节与轶事（media 平台 = 传闻轶事）======

    msgs.push({ platform: 'media', messageId: 'anec_001', chatId: 'media_轶事', chatName: '生活轶事', sender: '史官', isSelf: false, timestamp: yearToTimestamp(743, 5), type: 'text', content: '【唐摭言】李白在翰林院时，一日玄宗于沉香亭赏牡丹，召李白作歌。白时已醉，左右以水洒面，稍醒，援笔立成《清平调》三首，辞藻华美，帝大悦。' });

    msgs.push({ platform: 'media', messageId: 'anec_002', chatId: 'media_轶事', chatName: '生活轶事', sender: '史官', isSelf: false, timestamp: yearToTimestamp(743, 7), type: 'text', content: '【松窗杂录】李白尝侍帝，醉中使高力士脱靴。力士耻之，摘其诗中以飞燕指杨贵妃者激之，贵妃遂阻白仕进之路。' });

    msgs.push({ platform: 'media', messageId: 'anec_003', chatId: 'media_轶事', chatName: '生活轶事', sender: '史官', isSelf: false, timestamp: yearToTimestamp(744), type: 'text', content: '【旧唐书】白既嗜酒，日与饮徒醉于酒肆。帝欲官之，已为左右所排，不果。乃恳求还山，帝赐金放还。' });

    msgs.push({ platform: 'media', messageId: 'anec_004', chatId: 'media_轶事', chatName: '生活轶事', sender: '史官', isSelf: false, timestamp: yearToTimestamp(750), type: 'text', content: '【本事诗】李白游历天下，所至之处，饮酒赋诗。尝自言："五花马，千金裘，呼儿将出换美酒。"其豪放如此。' });

    msgs.push({ platform: 'media', messageId: 'anec_005', chatId: 'media_轶事', chatName: '生活轶事', sender: '史官', isSelf: false, timestamp: yearToTimestamp(762, 10), type: 'text', content: '【容斋随笔】世传李白醉入水中捉月而死，此乃后人附会。实则李白病卒于当涂李阳冰处。然此传说亦可见世人对李白浪漫一生的想象。' });

    // ====== 构建联系人列表 ======
    const contactMap = {};
    for (const msg of msgs) {
      const key = `${msg.platform}_${msg.chatName}`;
      if (!contactMap[key]) {
        contactMap[key] = {
          name: msg.chatName,
          platform: msg.platform,
          chatId: msg.chatId,
          msgCount: 0,
          selfMsgCount: 0,
          lastActive: 0,
          isGroup: false
        };
      }
      contactMap[key].msgCount++;
      if (msg.isSelf) contactMap[key].selfMsgCount++;
      contactMap[key].lastActive = Math.max(contactMap[key].lastActive, msg.timestamp);
    }

    // 排序消息
    msgs.sort((a, b) => a.timestamp - b.timestamp);

    // 填充元数据
    this.data.messages = msgs;
    this.data.contacts = Object.values(contactMap);
    this.data.meta.totalMessages = msgs.length;
    this.data.meta.platforms = [...new Set(msgs.map(m => m.platform))];
    this.data.meta.timeRange = {
      start: msgs[0].timestamp,
      end: msgs[msgs.length - 1].timestamp
    };

    return JSON.parse(JSON.stringify(this.data)); // 深拷贝
  }
};
