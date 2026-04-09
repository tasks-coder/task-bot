const { Client, GatewayIntentBits } = require('discord.js');
const dayjs = require('dayjs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = "6w";

let tasks = [];

// ===== 起動 =====
client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

// ===== メッセージ =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const text = message.content;

  // ===== タスク登録 =====
  if (text.startsWith('!task')) {
    const parts = text.replace('!task ', '').split(' ');
    const name = parts[0];
    const start = dayjs(parts[1]);
    const end = dayjs(parts[2]);

    const task = {
      name,
      start,
      end,
      duration: end.diff(start, 'hour', true),
      priority: calcPriority(name, start)
    };

    tasks.push(task);

    await message.reply(`✅ ${name} を登録しました`);
    analyzeAndSuggest(message);
  }

  // ===== おはよう =====
  if (text === "おはよう") {
    sendMorning(message);
  }

  // ===== 今日 =====
  if (text === "!today") {
    sendSchedule(message);
  }
});

// ===== 朝の報告 =====
function sendMorning(message) {
  let msg = "☀️ おはようございます\n\n";
  msg += buildSchedule();
  msg += "\n" + analyze();
  message.reply(msg);
}

// ===== スケジュール生成 =====
function buildSchedule() {
  let msg = "📅 今日の予定\n";

  const sorted = [...tasks].sort((a,b)=>a.start - b.start);

  sorted.forEach(t => {
    msg += `${t.start.format('HH:mm')}-${t.end.format('HH:mm')} ${t.name}\n`;
  });

  return msg;
}

// ===== 分析 =====
function analyze() {
  let total = 0;
  tasks.forEach(t => total += t.duration);

  if (total > 10) {
    return `\n⚠️ タスク過多（+${(total-10).toFixed(1)}h）\n\n💡 ${suggestImprove()}`;
  }

  return "\n余裕があります";
}

// ===== 改善提案 =====
function suggestImprove() {
  let msg = "調整案：\n";

  const low = tasks.filter(t => t.priority === "低");

  if (low.length > 0) {
    msg += `・${low[0].name} を後回しにできます\n`;
  }

  msg += "・睡眠時間を確保してください\n";
  msg += "💤 " + suggestSleep();

  return msg;
}

// ===== 睡眠提案 =====
function suggestSleep() {
  const sorted = [...tasks].sort((a,b)=>a.start - b.start);

  let last = dayjs().startOf('day');
  let free = [];

  sorted.forEach(t => {
    if (t.start.isAfter(last)) {
      free.push({start:last, end:t.start});
    }
    last = t.end;
  });

  for (let f of free) {
    const h = f.end.diff(f.start, 'hour', true);
    if (h >= 6) {
      return `${f.start.format('HH:mm')}〜${f.end.format('HH:mm')}`;
    }
  }

  return "確保不可";
}

// ===== 優先度 =====
function calcPriority(name, start) {
  let importance = name.includes("編集") ? 5 : 3;
  let urgency = start.diff(dayjs(), 'hour') < 24 ? 4 : 2;

  const score = importance * 2 + urgency;

  if (score >= 8) return "高";
  if (score >= 5) return "中";
  return "低";
}

// ===== 総合分析 =====
function analyzeAndSuggest(message) {
  let msg = "📊 現在の状況\n";
  msg += analyze();
  message.reply(msg);
}

// ===== 表示 =====
function sendSchedule(message) {
  let msg = buildSchedule();
  msg += "\n" + analyze();
  message.reply(msg);
}

client.login(TOKEN);




// ===== リマインド登録 =====
function scheduleReminder(task, message) {
  const now = dayjs();
  const remindTime = task.start.subtract(10, 'minute');

  const diff = remindTime.diff(now);

  if (diff > 0) {
    setTimeout(() => {
      message.channel.send(`⏰ 10分後に「${task.name}」が始まります`);
    }, diff);
  }
}