// All the game's content lives here as plain data so the story can be rewritten
// without touching a line of engine code.

export const RANKS = [
  'Tiny Blob', 'Squishling', 'Wobbler', 'Blob Scout', 'Deep Diver',
  'Pearl Seeker', 'Blob Champion', 'Legend of the Deep',
];
export const xpForLevel = (lvl) => 80 + lvl * 70;

// ------------------------------------------------------------------ NPCs
export const NPCS = [
  {
    id: 'gran', name: 'Grandma Wobble', x: 12, z: 10, ry: -2.4,
    look: { color: 0xf6b7c4, hat: 'flower', size: 1.15, happy: true },
    idle: ['Back in my day the Deep was lovely and warm.',
           'Mind the crabs, dear. Pinchy little things.',
           'You have got your grandmother\'s wobble, you know.'],
  },
  {
    id: 'glub', name: 'Professor Glub', x: 10, z: 26, ry: -0.4,
    look: { color: 0xa8cfd6, hat: 'snorkel', size: 1.05 },
    idle: ['Fascinating. Terrible, but fascinating.',
           'Five sockets. Five pearls. The maths is not hard, the finding is.',
           'Do not touch anything. Actually, touch everything. Science!'],
  },
  {
    id: 'shelly', name: 'Shelly Shopkeep', x: -4, z: -65, ry: 2.6,
    look: { color: 0xf0a293, hat: 'chef', size: 1.05, happy: true },
    idle: ['Fresh snacks! Warm hats! Reasonable prices!',
           'No haggling. Well. A little haggling.',
           'If you find anything shiny, I will find you a price.'],
    shop: true,
  },
  {
    id: 'penny', name: 'Mr. Pennysquish', x: 82, z: -34, ry: 0.1,
    look: { color: 0xf0a293, hat: 'tophat', size: 1.3, brows: true },
    idle: ['Time is Blubbles, my little friend.',
           'I do not have pearls. I have ASSETS.',
           'Everything is for sale. Especially things that were not mine.'],
  },
  {
    id: 'king', name: 'King Grumpfish', x: 0, z: -136, ry: 0,
    look: { color: 0xf2a8a0, hat: 'crown', size: 1.9, brows: true, angry: true },
    idle: ['HMPH.', 'Go away. Politely. But go away.',
           'A king does not sulk. A king BROODS.'],
  },
  {
    id: 'pip', name: 'Pip', x: -18, z: -6, ry: 1.2,
    look: { color: 0xffd4a8, size: 0.62, eyeSize: 1.25, happy: true, tiny: true },
    idle: ['Wanna hear a joke? ...I forgot it.', 'I am very good at hiding. Probably.'],
  },
];

// ------------------------------------------------------------------ shop
export const SHOP = [
  { id: 'lantern', name: 'Glow Lantern', ico: '&#127982;', price: 60,
    desc: 'Lights up the dark Kelp Tangle.' },
  { id: 'woolly', name: 'Warm Woolly Hat', ico: '&#129506;', price: 80,
    desc: 'Extremely cosy. Someone grumpy might like it.' },
  { id: 'magnet', name: 'Snack Magnet', ico: '&#129522;', price: 90,
    desc: 'Blubbles fly to you from further away.' },
  { id: 'floaty', name: 'Bubble Belt', ico: '&#127880;', price: 110,
    desc: 'Jump much higher. Very bouncy.' },
  { id: 'fins', name: 'Speedy Fins', ico: '&#128034;', price: 140,
    desc: 'Wobble around noticeably faster.' },
  { id: 'hat_party', name: 'Party Hat', ico: '&#127881;', price: 40, hat: 'party', desc: 'For celebrating. Obviously.' },
  { id: 'hat_flower', name: 'Flower Crown', ico: '&#127804;', price: 45, hat: 'flower', desc: 'Very pretty. Slightly damp.' },
  { id: 'hat_chef', name: 'Chef Hat', ico: '&#128118;', price: 55, hat: 'chef', desc: 'You cannot cook. Wear it anyway.' },
  { id: 'hat_pirate', name: 'Pirate Hat', ico: '&#127988;', price: 75, hat: 'pirate', desc: 'Arrr. Blub.' },
  { id: 'hat_snorkel', name: 'Snorkel', ico: '&#129399;', price: 65, hat: 'snorkel', desc: 'You live underwater. It is a fashion choice.' },
];

// ------------------------------------------------------------------ quests
// step types: collect | goto | talk | buy | flag
export const QUESTS = [
  {
    id: 'snacks', title: 'Snack Attack', giver: 'gran', autoStart: true,
    desc: 'Grandma Wobble dropped her snacks all over Wobble Bay.',
    steps: [{ t: 'collect', tag: 'blubble', n: 12, text: 'Collect Blubbles' }],
    reward: { coins: 30, xp: 40, unlock: 'dash' },
    start: ["Oh! A young blob. Dreadful timing, dear, the whole Deep has gone cold.",
            "Make yourself useful: my snacks rolled off everywhere. Fetch me 12 Blubbles?",
            "Just wobble into them. You will get the hang of it."],
    nag: ["Twelve Blubbles, dear. They are the glowing blue ones. You cannot miss them."],
    turnIn: ["Marvellous! Here, take some for yourself.",
             "And here is a trick: DASH. Every blob should know how to dash.",
             "Now go and see Professor Glub up at the Great Vent. He has been shouting about it all week."],
  },
  {
    id: 'vent', title: 'The Vent Went Out', giver: 'glub', unlockedBy: 'snacks',
    desc: 'Find out what happened to the Great Bubble Vent.',
    steps: [
      { t: 'goto', x: 0, z: 58, r: 14, text: 'Go and inspect the Great Vent' },
    ],
    reward: { xp: 30 },
    start: ["Ah! Finally. Look at it. Cold. Silent. Deeply upsetting.",
            "The Vent runs on five Glow Pearls. Look at the sockets: EMPTY. All five.",
            "Somebody has been collecting them. I have a horrible feeling I know who.",
            "Start at Blobton Market, south of here. Shelly hears everything."],
    nag: ["The Vent. The big cold thing. North of the bay. Go and look at it properly."],
    turnIn: ["Right. Five pearls. Bring them back here and we relight the Deep.",
             "I have marked your quest journal. Off you go."],
  },
  {
    id: 'crates', title: 'Crabby Business', giver: 'shelly', unlockedBy: 'vent',
    desc: 'Crabs made off with Shelly\'s delivery crates.',
    steps: [
      { t: 'collect', tag: 'crate', n: 5, text: 'Recover the stolen crates' },
    ],
    reward: { coins: 70, xp: 60, pearl: 1 },
    start: ["A pearl? Ha! Funny you should ask.",
            "I had one. It was in a crate. The crates got nicked by crabs. Five of them.",
            "Bring my crates back and the pearl is yours. It is no use to me, it will not fit in the till."],
    nag: ["Five crates. The crabs dragged them all round the market. Look behind things."],
    turnIn: ["My crates! You are a treasure.",
             "Here is your pearl. One down, four to go, and the other four are going to be harder.",
             "Ask the Professor about the Kelp Tangle. And buy a lantern first, unless you fancy the dark."],
  },
  {
    id: 'lantern', title: 'Into the Tangle', giver: 'glub', unlockedBy: 'crates',
    desc: 'The second pearl is lost somewhere in the dark Kelp Tangle.',
    steps: [
      { t: 'buy', item: 'lantern', text: 'Buy a Glow Lantern from Shelly' },
      { t: 'collect', tag: 'switch', n: 3, text: 'Wake the three Glow Anemones' },
      { t: 'collect', tag: 'pearl2', n: 1, text: 'Take the Glow Pearl' },
    ],
    reward: { coins: 40, xp: 80, pearl: 2 },
    start: ["Pearl number two is in the Kelp Tangle, west of here. I am ninety percent certain.",
            "It is pitch dark in there. Buy a Glow Lantern from Shelly first, I insist.",
            "Then wake the three Glow Anemones. They light the way to the pearl."],
    nag: ["Lantern first! Then three anemones in the Tangle. West. The dark whispery bit."],
    turnIn: ["Two pearls! Now. The unpleasant part.",
             "The other three are with Mr. Pennysquish, in his plaza to the east.",
             "Be careful. He is very friendly and that is the problem."],
  },
  {
    id: 'tycoon', title: 'A Very Fair Deal', giver: 'penny', unlockedBy: 'lantern',
    desc: 'Mr. Pennysquish will sell you a pearl. Or you could find his lucky coin.',
    steps: [{ t: 'flag', flag: 'pearl3', at: [82, -34], text: 'Get a pearl out of Mr. Pennysquish' }],
    reward: { xp: 70, pearl: 3 },
    choice: true,
    start: ["Aha! The little pearl hunter. I have been expecting you. I expect everyone.",
            "Yes, I have pearls. Three of them. Bought fair and square from blobs who needed the money.",
            "I will do you a deal on one. Two hundred Blubbles. Cash.",
            "OR... I have lost my lucky coin somewhere back in Wobble Bay. Find it and the pearl is a gift."],
    nag: ["Two hundred Blubbles, or my lucky coin. Somewhere in Wobble Bay. Tick tock."],
    turnIn: ["A deal is a deal. Pearl number three, all yours."],
  },
  {
    id: 'vaultrun', title: 'The Vault Run', giver: 'penny', unlockedBy: 'tycoon',
    desc: 'Grab 25 gold coins in the plaza before time runs out.',
    steps: [{ t: 'flag', flag: 'vaultrun', at: [82, -34], text: 'Collect 25 gold coins in 60 seconds' }],
    reward: { coins: 120, xp: 100, pearl: 4 },
    start: ["You want ANOTHER pearl? Greedy. I like it.",
            "New deal. A sporting one. I am opening the vault and throwing my coins about the plaza.",
            "Gather twenty-five of them in sixty seconds and pearl four is yours.",
            "Fail and you may try again. I am generous, not stupid."],
    nag: ["Twenty-five coins. Sixty seconds. Come and talk to me when you feel brave."],
    turnIn: ["Astonishing. Take it, take it. That was worth the entertainment.",
             "The last pearl? Not mine, thank goodness. The King has it. Stuck it in his crown.",
             "Good luck. He has not smiled since the Vent went out."],
  },
  {
    id: 'cheerup', title: 'Cheering Up a King', giver: 'king', unlockedBy: 'vaultrun',
    desc: 'The last pearl is in the King\'s crown. He is not in a giving mood.',
    steps: [
      { t: 'collect', tag: 'gift_rock', n: 1, text: 'Find the Softest Rock (Wobble Bay)' },
      { t: 'buy', item: 'woolly', text: 'Buy the Warm Woolly Hat' },
      { t: 'collect', tag: 'gift_joke', n: 1, text: 'Get a Very Good Joke from Pip' },
    ],
    reward: { xp: 140, pearl: 5, hat: 'crown' },
    start: ["WHAT. ...Oh. It is a small one.",
            "You want my pearl. Everyone wants my pearl. It is the only nice thing I have left.",
            "I am COLD, small blob. I am cold and my throne is lumpy and nobody has made me laugh in a year.",
            "Fix those three things and you may have the wretched pearl. Now go. Politely."],
    nag: ["Cold. Lumpy. Unamused. Three problems, small blob. HMPH."],
    turnIn: ["A soft rock... a warm hat... and... pfff. HA. HAHAHA! Oh, that IS good.",
             "...I have not done that in a very long time. Thank you.",
             "Take the pearl. Take the crown too, it never fitted. Go and light the Deep back up.",
             "And... come back and visit. If you like."],
  },
  {
    id: 'finale', title: 'Light the Deep', giver: null, unlockedBy: 'cheerup', autoStart: true,
    desc: 'Put all five Glow Pearls into the Great Vent.',
    steps: [{ t: 'flag', flag: 'lit', at: [0, 58], text: 'Put the five pearls in the Great Vent' }],
    reward: { xp: 300, coins: 300 },
    turnIn: [],
  },
  // ---- side quests ----
  {
    id: 'hide', title: 'Hide and Squeak', giver: 'pip', side: true, unlockedBy: 'vent',
    desc: 'Pip is hiding. Pip is not very good at hiding.',
    steps: [{ t: 'collect', tag: 'pip', n: 3, text: 'Find Pip' }],
    reward: { coins: 60, xp: 50, item: 'gift_joke', hatUnlock: 'party' },
    start: ["Hi hi hi! Wanna play hide and squeak?",
            "I hide, you find me, three times, and then I will tell you my BEST joke.",
            "Counting to ten! One... two... seven... ten! Go!"],
    nag: ["I am hiding SO well. Behind something. Somewhere. Keep looking!"],
    turnIn: ["You found me three times! OK OK, here is the joke:",
             "Why did the blobfish get bad marks at school? ...Because it was BELOW C level!",
             "Hee hee. Write it down, it is a very good joke."],
  },
  {
    id: 'friends', title: 'Twelve Little Friends', giver: null, side: true, autoStart: true,
    desc: 'Twelve baby blobfish got lost. They are hiding all over the Deep.',
    steps: [{ t: 'collect', tag: 'friend', n: 12, text: 'Find lost baby blobfish' }],
    reward: { coins: 200, xp: 150, hatUnlock: 'pirate' },
  },
];

// Fixed-position quest items. Everything else is scattered procedurally.
export const QUEST_ITEMS = {
  crate:      [[6, -60], [18, -70], [-2, -86], [-20, -78], [14, -88]],
  switch:     [[-92, -50], [-66, -28], [-84, -20]],
  pearl2:     [[-80, -56]],
  luckycoin:  [[-34, 26]],
  gift_rock:  [[28, -22]],
  // Pip's three hiding places, used in order
  pipSpots:   [[-40, 14], [22, -46], [-70, -12]],
};

// The twelve baby blobfish, hand-placed so they are findable but not obvious.
export const FRIEND_SPOTS = [
  [24, 24], [-30, -12], [40, -8], [-14, 34], [8, -40], [-52, -60],
  [-96, -34], [66, -22], [96, -62], [-24, -104], [30, -120], [-40, -142],
];
