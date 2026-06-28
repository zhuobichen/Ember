/**
 * 名人数据集 - 张雪峰
 *
 * 多维度资料来源，拼凑完整人物画像：
 * 1. 演讲语录（按年份）— 作为本人"发送"的消息
 * 2. 与学生/公众互动 — 直播连麦、问答场景
 * 3. 书籍作品 — 出版物内容摘录
 * 4. 媒体报道 — 新闻事件、综艺参与
 * 5. 公众评价 — 支持者与批评者的声音
 * 6. 生平事件 — 从北漂讲师到教育企业家的历程
 *
 * 数据来源：
 * - 百度百科/快懂百科：张雪峰词条
 * - 张雪峰公开演讲视频整理
 * - 《你离考研成功，就差这本书》《方向比努力更重要》
 * - 抖音/微博公开直播内容
 * - 各媒体新闻报道（九派新闻、头条等）
 *
 * 特别说明：张雪峰于2026年3月24日因心源性猝死去世，终年41岁。
 * 他一生致力于帮助普通家庭的孩子做出更好的教育和职业选择。
 * 谨以此数据集纪念他。
 */

function yearToTimestamp(year, month = 6) {
  return Math.floor(Date.UTC(year - 1, month - 1, 15) / 1000);
}

export const zhangxuefeng = {
  name: '张雪峰',
  realName: '张子彪',
  birthYear: 1984,
  deathYear: 2026,
  description: '考研导师、教育企业家，峰学蔚来创始人（1984-2026）',

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

  build() {
    const msgs = [];

    // ====== 一、演讲语录（本人发出的消息，按年份排列）======

    // --- 北漂早期（2007-2015）：默默耕耘 ---
    msgs.push({ platform: 'web', messageId: 'spk_001', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2008), type: 'text', content: '我第一次站上讲台，讲了半天，底下学生说"老师你讲得太无聊了"。那天下了课我就在想，考研这件事本身就很枯燥，怎么才能让学生愿意听？我得换一种方式。' });

    msgs.push({ platform: 'web', messageId: 'spk_002', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2009), type: 'text', content: '我开始一个学校一个学校地跑，收集了全国400多所大学、400多个科研院所的资料。招生简章、录取情况、就业去向，我全整理成课件。我要让每一个来听课的学生，都能找到适合自己的方向。' });

    msgs.push({ platform: 'web', messageId: 'spk_003', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2010), type: 'text', content: '后来我终于找到了讲课的感觉。学生开始笑了，开始记笔记了，下课还来问我问题了。那一刻我知道，这条路走对了。' });

    msgs.push({ platform: 'web', messageId: 'spk_004', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2013), type: 'text', content: '考研不是目的，考研是实现目的的一种手段。你为什么要考研？是为了更好的工作，更高的平台，还是真的热爱学术？先想清楚这个问题，再决定要不要考。' });

    // --- 走红时期（2016-2019）：七分钟解读985 ---
    msgs.push({ platform: 'web', messageId: 'spk_005', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2016, 6), type: 'text', content: '《七分钟解读34所985高校》\n清华北大不用多说，大家都想上。但我想说的是，每个学校都有自己的优势学科。你比如哈工大的焊接，全国第一；西北工业大学的航空航天，那也是顶尖的。选学校不是选名气，是选适合你的专业和方向。' });

    msgs.push({ platform: 'web', messageId: 'spk_006', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2016, 9), type: 'text', content: '我写了一本书叫《你离考研成功，就差这本书》。不是说我有多厉害，而是我见过太多走弯路的学生了。有的选错了专业，有的复习方法不对，有的就是心态崩了。我希望这本书能帮到那些在黑暗中摸索的人。' });

    msgs.push({ platform: 'web', messageId: 'spk_007', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2017, 3), type: 'text', content: '选择比努力更重要，方向不对，努力白费。这不是说努力不重要，而是说如果你选错了方向，你越努力离目标越远。先选对方向，再全力以赴。' });

    msgs.push({ platform: 'web', messageId: 'spk_008', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2018, 5), type: 'text', content: '《选择比努力更重要》这本书出版了。我想告诉每一个普通家庭的孩子：你的出身不能选择，但你的方向可以。不要盲目跟风，不要好高骛远，找到适合自己的路，然后走下去。' });

    msgs.push({ platform: 'web', messageId: 'spk_009', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2019, 6), type: 'text', content: '有学生问我，张老师我家里条件不好，要不要考研？我说你先想清楚一件事：考研是为了什么？如果是为了更好的就业，那你就选就业好的专业；如果是为了逃避就业，那你就是在浪费时间和家里的钱。' });

    // --- 争议与影响力（2020-2023）：专业选择引爆全网 ---
    msgs.push({ platform: 'web', messageId: 'spk_010', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2020, 7), type: 'text', content: '家里没矿别谈理想，你的兴趣应该是先让自己活下来。这话听着残酷，但对普通家庭的孩子来说就是现实。你先有一技之长，能养活自己，再谈理想不迟。' });

    msgs.push({ platform: 'web', messageId: 'spk_011', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2021, 4), type: 'text', content: '《方向比努力更重要》出版了。这本书里我讲了很多真实案例，有成功的也有失败的。我想让大家看到，选专业不是拍脑袋的事，它关系到你未来几十年的人生。' });

    msgs.push({ platform: 'web', messageId: 'spk_012', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2022, 6), type: 'text', content: '生化环材四大天坑，不读到硕博根本没出路。我不是歧视这些专业，我是说本科毕业的就业现实就是这样。你要是真心热爱，那就读到博士去做科研；如果只是为了就业，那就要慎重。' });

    msgs.push({ platform: 'web', messageId: 'spk_013', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 2), type: 'text', content: '6年还60万房贷，利息57万。这不是吓唬谁，这是普通人的真实生活。你选了一个低收入的专业，以后买房还贷就是这种压力。我不是说钱最重要，但你得知道现实是什么。' });

    msgs.push({ platform: 'web', messageId: 'spk_014', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 5), type: 'text', content: '如果我是家长，孩子非要报新闻学，我一定会把他打晕，然后给他报个别的。这话说的确实狠了点，但我的意思是：新闻学本科就业面太窄了，普通家庭的孩子赌不起。你要是家里有矿，随便报。' });

    msgs.push({ platform: 'web', messageId: 'spk_015', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 6), type: 'text', content: '我因过度劳累被医院强制收治了。胸闷心悸。大家一定要注意身体，别像我一样。赚钱重要，但命更重要。' });

    msgs.push({ platform: 'web', messageId: 'spk_016', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 10), type: 'text', content: '我当选了江苏省人大代表。这不只是荣誉，更是责任。我会继续为教育公平发声，为普通家庭的孩子争取更多机会。' });

    // --- 最后的时光（2024-2026）---
    msgs.push({ platform: 'web', messageId: 'spk_017', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2024, 1), type: 'text', content: '今年我要给资助的贫困生送电脑。我当年也是穷人家的孩子，知道一台电脑对学习有多重要。能帮一个是一个。' });

    msgs.push({ platform: 'web', messageId: 'spk_018', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2024, 6), type: 'text', content: '女儿九岁了，生日快乐。爸爸做这些事，就是希望你这一代人能有更多选择，不用像爸爸当年那样摸黑走路。' });

    msgs.push({ platform: 'web', messageId: 'spk_019', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2025, 1), type: 'text', content: '公司350个员工，年终奖发了2000万，人均近6万。我对员工好，是因为他们也在帮着千万个家庭的孩子找方向。我们做的事是有意义的。' });

    msgs.push({ platform: 'web', messageId: 'spk_020', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2025, 3), type: 'text', content: '2025届志愿填报名额20分钟就售罄了。谢谢大家的信任。我知道有人说我贵，但我能帮到的每一个家庭，都值这个价。' });

    msgs.push({ platform: 'web', messageId: 'spk_021', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2025, 9), type: 'text', content: '我被各平台禁言了。我承认直播时说了不该说的话，我深刻反省。但我想帮人的心没有变。以后我会注意方式方法。' });

    msgs.push({ platform: 'web', messageId: 'spk_022', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2025, 12), type: 'text', content: '处罚期过了，谢谢大家的关心支持，以后不会了。我还在，还会继续帮大家。' });

    msgs.push({ platform: 'web', messageId: 'spk_023', chatId: 'web_演讲', chatName: '演讲记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2026, 3, 20), type: 'text', content: '人生真好玩，下辈子还来。能够帮助到大家是最重要的。' });

    // ====== 二、与学生/公众互动（qq 平台 = 社交往来）======

    // --- 学生提问 ---
    msgs.push({ platform: 'social', messageId: 'chat_001', chatId: 'social_学生A', chatName: '考研学生A', sender: '学生A', isSelf: false, timestamp: yearToTimestamp(2016, 10), type: 'text', content: '张老师，我本科三本，想考985，有可能吗？' });
    msgs.push({ platform: 'social', messageId: 'chat_002', chatId: 'social_学生A', chatName: '考研学生A', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2016, 10), type: 'text', content: '有可能，但你要付出比别人多十倍的努力。而且选学校要有策略，不要一上来就冲最顶尖的，选一个你有把握的985，选对专业，然后拼命。' });

    msgs.push({ platform: 'social', messageId: 'chat_003', chatId: 'social_家长B', chatName: '高考家长B', sender: '家长B', isSelf: false, timestamp: yearToTimestamp(2023, 6), type: 'text', content: '张老师，我女儿想学新闻，怎么劝都不听，怎么办？' });
    msgs.push({ platform: 'social', messageId: 'chat_004', chatId: 'social_家长B', chatName: '高考家长B', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 6), type: 'text', content: '让她去了解一下新闻学毕业生的就业率和起薪。不是说不让她追求梦想，是让她知道选了这条路以后会面对什么。知情后再做选择，我不拦着。' });

    msgs.push({ platform: 'social', messageId: 'chat_005', chatId: 'social_学生C', chatName: '迷茫学生C', sender: '学生C', isSelf: false, timestamp: yearToTimestamp(2024, 6), type: 'text', content: '张老师，我是普通二本计算机，毕业能找到好工作吗？还是必须考研？' });
    msgs.push({ platform: 'social', messageId: 'chat_006', chatId: 'social_学生C', chatName: '迷茫学生C', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2024, 6), type: 'text', content: '计算机这个专业，技术为王。你二本毕业，如果技术过硬，项目经验丰富，一样能进好公司。但如果你技术一般，那考研提升学历确实是个选择。关键看你自己是什么水平。' });

    msgs.push({ platform: 'social', messageId: 'chat_007', chatId: 'social_学生D', chatName: '农村学生D', sender: '学生D', isSelf: false, timestamp: yearToTimestamp(2024, 12), type: 'text', content: '张老师，我是农村出来的，家里供我读书很不容易。我想选个好就业的专业，但不知道选什么。' });
    msgs.push({ platform: 'social', messageId: 'chat_008', chatId: 'social_学生D', chatName: '农村学生D', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2024, 12), type: 'text', content: '农村出来的孩子，我特别理解你。你选专业就一个原则：好就业、起薪高、能尽快回报家里。计算机、电气、机械这些工科，就业都不错。别去追什么热门冷门，选一个你学得了、就业好的，然后好好学。' });

    msgs.push({ platform: 'social', messageId: 'chat_009', chatId: 'social_粉丝E', chatName: '粉丝E', sender: '粉丝E', isSelf: false, timestamp: yearToTimestamp(2025, 7), type: 'text', content: '峰哥，你帮了我太多了。当年听了你的话选了电气工程，现在毕业进了国家电网，年薪20万。真心感谢！' });
    msgs.push({ platform: 'social', messageId: 'chat_010', chatId: 'social_粉丝E', chatName: '粉丝E', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2025, 7), type: 'text', content: '好样的！这就是我坚持做这件事的原因。你过得好，就是对我最大的回报。' });

    msgs.push({ platform: 'social', messageId: 'chat_011', chatId: 'social_网友F', chatName: '质疑网友F', sender: '网友F', isSelf: false, timestamp: yearToTimestamp(2023, 6), type: 'text', content: '张雪峰你就是个贩卖焦虑的商人，你把教育搞成了生意！' });
    msgs.push({ platform: 'social', messageId: 'chat_012', chatId: 'social_网友F', chatName: '质疑网友F', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2023, 6), type: 'text', content: '你说得对，我是商人，我收费。但我卖的是信息差，是经验，是帮你少走弯路。你觉得不值可以不买，但那些被我帮到的家庭，他们觉得值。' });

    // ====== 三、书籍作品（book 平台 = 出版文献）======

    msgs.push({ platform: 'media', messageId: 'doc_001', chatId: 'book_著作', chatName: '书籍作品', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2016, 9), type: 'text', content: '《你离考研成功，就差这本书》（2016年出版）\n这本书写给所有准备考研的人。考研是一场信息战，你知道得越多，胜算越大。书里我整理了各校各专业的录取数据、复习策略、心态调整方法。我不是天才，我只是把别人没整理的信息整理了。' });

    msgs.push({ platform: 'media', messageId: 'doc_002', chatId: 'book_著作', chatName: '书籍作品', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2018, 5), type: 'text', content: '《选择比努力更重要：名师张雪峰手把手教你填报高考志愿》（2018年出版）\n高考志愿填报，是普通人人生中最重要的选择之一。这本书我想告诉家长和学生：不要只看分数和学校名气，要看专业、看就业、看城市、看自己的实际情况。选择对了，你的努力才有意义。' });

    msgs.push({ platform: 'media', messageId: 'doc_003', chatId: 'book_著作', chatName: '书籍作品', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2021, 4), type: 'text', content: '《方向比努力更重要》（2021年出版）\n这些年我见过太多走弯路的人了。有的人明明很努力，但方向错了，越走越远。这本书里我讲了很多真实案例，有成功的也有失败的。我希望每个人都能找到属于自己的方向。' });

    msgs.push({ platform: 'media', messageId: 'doc_004', chatId: 'book_著作', chatName: '书籍作品', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2021, 12), type: 'text', content: '《决胜高中三年关键期》（2021年出版）\n高中三年决定了你人生的起点。这本书写给高中生和家长，讲怎么选科、怎么规划、怎么在关键节点做出正确的选择。每个阶段都有不同的重点，错过了就很难补回来。' });

    // ====== 四、媒体报道与生平事件（media 平台 = 媒体史料）======

    msgs.push({ platform: 'media', messageId: 'hist_001', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(1984, 5), type: 'system', content: '【生平】1984年5月18日，张雪峰（本名张子彪）出生于黑龙江省齐齐哈尔市富裕县。祖籍山东临清。上高中前没去过省城哈尔滨。' });

    msgs.push({ platform: 'media', messageId: 'hist_002', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2003, 9), type: 'system', content: '【生平】高考凭借努力考入郑州大学，就读土木类（给排水工程）专业。大学期间开始帮同学收集考研资料，由此发现了自己对教育咨询的兴趣。' });

    msgs.push({ platform: 'media', messageId: 'hist_003', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2007, 7), type: 'system', content: '【生平】大学毕业后北漂，带着一个行李箱和几件换洗衣服到北京。在海天考研、文都考研等机构做讲师，月薪2500元，蜗居在海淀区六郎庄村的群租房里。' });

    msgs.push({ platform: 'media', messageId: 'hist_004', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2008), type: 'system', content: '【生平】正式走上讲台。初期讲课风格不受欢迎，备受打击后反复琢磨备课。亲自搜集全国400多所大学、400多个科研院所的资料。直到2010年才找到能抓住学生兴趣的讲课方式。' });

    msgs.push({ platform: 'media', messageId: 'hist_005', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2016, 6), type: 'system', content: '【走红】凭借《七分钟解读34所985高校》视频走红网络。以幽默直白的风格迅速积累大量粉丝。同年9月出版第一本书。' });

    msgs.push({ platform: 'media', messageId: 'hist_006', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2016, 11), type: 'system', content: '【综艺】参加优酷《火星情报局》第二季，开始进入大众视野。此后多次参加各类综艺节目。' });

    msgs.push({ platform: 'media', messageId: 'hist_007', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2018, 11), type: 'system', content: '【跑步】开始跑步生涯。因录制节目时跑不过比自己大12岁的张绍刚，不服输地立下"每天跑5公里"的目标。此后跑步成为他生活的重要部分。' });

    msgs.push({ platform: 'media', messageId: 'hist_008', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2020), type: 'system', content: '【跑步】全年跑量超过3000公里。完成波士顿马拉松线上赛首马，成绩4小时9分57秒。后在杭州马拉松跑出4小时00分13秒的个人最好成绩，距"破4"仅差13秒。' });

    msgs.push({ platform: 'media', messageId: 'hist_009', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2021, 3), type: 'system', content: '【创业】举家搬迁到苏州，开启"二次创业"。5月成立苏州峰学蔚来教育科技有限公司，注册资本1000万。' });

    msgs.push({ platform: 'media', messageId: 'hist_010', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2022, 5), type: 'system', content: '【公益】向黑龙江省希望工程捐款30万元，资助家乡家庭经济困难高考学生。' });

    msgs.push({ platform: 'media', messageId: 'hist_011', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2023, 1), type: 'system', content: '【荣誉】当选江苏省第十四届人民代表大会代表。同年9月被聘为山东临清市招商大使。' });

    msgs.push({ platform: 'media', messageId: 'hist_012', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2023, 5), type: 'system', content: '【争议】发布视频称"如果孩子非要报新闻学，我一定会把他打晕"。引发社会广泛争议。新闻传播学类专业在各省录取最低位次平均下降15%，山东等省份降幅超30%。' });

    msgs.push({ platform: 'media', messageId: 'hist_013', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2024, 2), type: 'system', content: '【专利】发明的"一种高校招生信息推荐方法和系统"专利获得授权。3月注册旅行社，5月上架研学项目，进军研学游市场。' });

    msgs.push({ platform: 'media', messageId: 'hist_014', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2025, 3), type: 'system', content: '【商业】2025届志愿填报名额开售，20分钟多省份售罄。梦想卡12999元，圆梦卡18999元。' });

    msgs.push({ platform: 'media', messageId: 'hist_015', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2025, 9), type: 'system', content: '【风波】各平台账号被禁止关注，因直播中使用污言秽语被限期禁言、停播。10月22日恢复。12月发文称已深刻反省。' });

    msgs.push({ platform: 'media', messageId: 'hist_016', chatId: 'media_史传', chatName: '生平记录', sender: '媒体', isSelf: false, timestamp: yearToTimestamp(2026, 3, 24), type: 'system', content: '【逝世】2026年3月24日12点26分，张雪峰在公司跑步后出现不适，紧急送医。15点50分因心源性猝死全力抢救无效，在苏州逝世，终年41岁。3月28日在苏州殡仪馆举行追悼会。' });

    // ====== 五、公众评价（media 平台 = 公众评论）======

    msgs.push({ platform: 'media', messageId: 'eval_001', chatId: 'media_评价', chatName: '公众评价', sender: '支持者A', isSelf: false, timestamp: yearToTimestamp(2023, 7), type: 'text', content: '张雪峰是普通家庭孩子的指路明灯。那些批评他的人，根本不懂普通家庭选错专业意味着什么。他说的每一句话，都是血淋淋的现实。' });

    msgs.push({ platform: 'media', messageId: 'eval_002', chatId: 'media_评价', chatName: '公众评价', sender: '批评者B', isSelf: false, timestamp: yearToTimestamp(2023, 7), type: 'text', content: '他把教育功利化了，把大学变成了职业培训所。不是所有专业都要用就业率来衡量，人文社科的价值不是起薪能体现的。' });

    msgs.push({ platform: 'media', messageId: 'eval_003', chatId: 'media_评价', chatName: '公众评价', sender: '媒体评论', isSelf: false, timestamp: yearToTimestamp(2023, 8), type: 'text', content: '张雪峰现象的本质，是教育信息不对称的产物。他之所以受欢迎，是因为千千万万的家庭确实需要这样的信息。你可以不认同他的观点，但不能否认他帮到了很多人。' });

    msgs.push({ platform: 'media', messageId: 'eval_004', chatId: 'media_评价', chatName: '公众评价', sender: '学生C', isSelf: false, timestamp: yearToTimestamp(2024, 3), type: 'text', content: '我就是一个普通农村家庭的孩子，听了张老师的话选了电气工程，现在毕业进了国企。如果没有他，我可能还在迷茫。他可能说话不好听，但他说的都是实话。' });

    msgs.push({ platform: 'media', messageId: 'eval_005', chatId: 'media_评价', chatName: '公众评价', sender: '教育学者D', isSelf: false, timestamp: yearToTimestamp(2025, 1), type: 'text', content: '张雪峰的存在，折射出我国教育体系的一个痛点：学生和家长缺乏专业的生涯规划指导。他填补了这个空白，虽然方式有争议，但需求是真实的。' });

    msgs.push({ platform: 'media', messageId: 'eval_006', chatId: 'media_评价', chatName: '公众评价', sender: '网友E', isSelf: false, timestamp: yearToTimestamp(2026, 3, 25), type: 'text', content: '他走了，才41岁。不管你怎么看他，他确实帮了很多人。一路走好，张老师。' });

    msgs.push({ platform: 'media', messageId: 'eval_007', chatId: 'media_评价', chatName: '公众评价', sender: '网友F', isSelf: false, timestamp: yearToTimestamp(2026, 3, 25), type: 'text', content: '他曾经5次在微博提到猝死。他说过"如果选择一种死法会选择猝死"。没想到一语成谶。太让人心痛了。' });

    msgs.push({ platform: 'media', messageId: 'eval_008', chatId: 'media_评价', chatName: '公众评价', sender: '前员工G', isSelf: false, timestamp: yearToTimestamp(2026, 3, 26), type: 'text', content: '在峰学蔚来工作的那两年，峰哥对我们真的很好。年终奖人均近6万不是吹的。他常说，我们对员工好，员工才能对学生好。他做到了。' });

    msgs.push({ platform: 'media', messageId: 'eval_009', chatId: 'media_评价', chatName: '公众评价', sender: '家长H', isSelf: false, timestamp: yearToTimestamp(2026, 3, 27), type: 'text', content: '我儿子今年高考，本来还想着找张老师咨询。没想到他走了。他说的"选择比努力更重要"，我会记一辈子。愿天堂没有病痛。' });

    // ====== 六、跑步与生活（web 平台 = 个人记录）======

    msgs.push({ platform: 'media', messageId: 'anec_001', chatId: 'web_生活', chatName: '生活记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2018, 11), type: 'text', content: '今天录节目，跑步输给了张绍刚，他比我大12岁！不行，我要开始跑步了。每天5公里，说到做到！' });

    msgs.push({ platform: 'media', messageId: 'anec_002', chatId: 'web_生活', chatName: '生活记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2020, 4), type: 'text', content: '波士顿马拉松线上赛完赛！4小时9分57秒。从走+跑结合完成第一个5公里，到跑完全马，我用了不到两年。只要坚持，没什么做不到的。' });

    msgs.push({ platform: 'media', messageId: 'anec_003', chatId: 'web_生活', chatName: '生活记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2020, 11), type: 'text', content: '杭州马拉松4小时00分13秒！差13秒就破4了！下次一定！跑步教会我一件事：你永远可以比昨天的自己快一点。' });

    msgs.push({ platform: 'media', messageId: 'anec_004', chatId: 'web_生活', chatName: '生活记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2024, 6), type: 'text', content: '女儿九岁了。爸爸希望你以后能做自己喜欢的事，不用像爸爸这样天天操心别人的人生。但如果你也想帮助别人，爸爸支持你。' });

    msgs.push({ platform: 'media', messageId: 'anec_005', chatId: 'web_生活', chatName: '生活记录', sender: '张雪峰', isSelf: true, timestamp: yearToTimestamp(2026, 3, 20), type: 'text', content: '这个月已经跑了72公里了。跑步的时候是我最放松的时候。不用想工作，不用想争议，只有我和路。' });

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

    msgs.sort((a, b) => a.timestamp - b.timestamp);

    this.data.messages = msgs;
    this.data.contacts = Object.values(contactMap);
    this.data.meta.totalMessages = msgs.length;
    this.data.meta.platforms = [...new Set(msgs.map(m => m.platform))];
    this.data.meta.timeRange = {
      start: msgs[0].timestamp,
      end: msgs[msgs.length - 1].timestamp
    };

    return JSON.parse(JSON.stringify(this.data));
  }
};
