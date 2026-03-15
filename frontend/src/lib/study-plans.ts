import type { StudyPlan } from "./types";

export const STUDY_PLANS: StudyPlan[] = [
  {
    slug: "taming-the-mind",
    title: "Taming the Mind",
    subtitle: "For those seeking inner peace and mental discipline",
    icon: "brain",
    stages: [
      {
        title: "Understanding the Mind",
        description: "What is mind? Buddhist psychology basics, the five aggregates, how thoughts arise.",
        searchQuery: "Buddhist psychology five aggregates mind",
        tags: ["psychology"],
      },
      {
        title: "Mindfulness Foundations",
        description: "Satipatthana (four foundations of mindfulness), present-moment awareness, breathing meditation.",
        searchQuery: "satipatthana four foundations mindfulness anapanasati",
        tags: ["mindfulness"],
      },
      {
        title: "Working with Difficult Emotions",
        description: "Anger, fear, craving — recognizing and releasing. Metta (loving-kindness) practice.",
        searchQuery: "working with anger fear craving emotions metta",
        tags: ["metta"],
      },
      {
        title: "Concentration & Stillness",
        description: "Samatha meditation, jhana states, calming the restless mind.",
        searchQuery: "samatha meditation jhana concentration calm",
        tags: ["samatha", "meditation"],
      },
      {
        title: "Insight",
        description: "Vipassana practice, seeing impermanence (anicca), suffering (dukkha), non-self (anatta).",
        searchQuery: "vipassana insight impermanence anicca anatta",
        tags: ["vipassana"],
      },
      {
        title: "Daily Integration",
        description: "Bringing practice off the cushion, mindfulness in daily life.",
        searchQuery: "mindfulness daily life practice integration",
        tags: ["mindfulness"],
      },
    ],
  },
  {
    slug: "facing-pain",
    title: "Facing Pain & Suffering",
    subtitle: "For those dealing with physical pain, illness, or loss",
    icon: "heart",
    stages: [
      {
        title: "The Truth of Suffering",
        description: "The First Noble Truth — understanding dukkha, not as despair but as a starting point.",
        searchQuery: "first noble truth dukkha suffering understanding",
        tags: ["suffering"],
      },
      {
        title: "The Arrow Sutta",
        description: "Physical pain vs. mental suffering (SN 36.6) — the second arrow we don't have to shoot.",
        searchQuery: "arrow sutta SN 36.6 physical pain mental suffering second arrow",
        tags: ["suffering"],
      },
      {
        title: "Acceptance & Letting Go",
        description: "Impermanence of all things, including pain. Teachings on non-attachment.",
        searchQuery: "impermanence letting go non-attachment acceptance",
        tags: ["impermanence"],
      },
      {
        title: "Compassion for Self",
        description: "Metta and karuna (compassion) meditation directed inward, self-forgiveness.",
        searchQuery: "self compassion metta karuna self-forgiveness",
        tags: ["karuna"],
      },
      {
        title: "Death & Dying",
        description: "Maranasati (death contemplation), preparing the mind, the Tibetan approach to death.",
        searchQuery: "death dying maranasati death contemplation preparing",
        tags: ["death"],
      },
      {
        title: "Finding Peace",
        description: "Equanimity (upekkha), the unconditioned, nibbana as release from suffering.",
        searchQuery: "equanimity upekkha nibbana peace release suffering",
        tags: ["nibbana"],
      },
    ],
  },
  {
    slug: "helping-others",
    title: "Helping Others",
    subtitle: "For caregivers, friends, and anyone who wants to ease others' suffering",
    icon: "hands-helping",
    stages: [
      {
        title: "The Heart of Compassion",
        description: "Karuna (compassion), the Bodhisattva ideal, why we help.",
        searchQuery: "karuna compassion bodhisattva ideal helping",
        tags: ["karuna"],
      },
      {
        title: "Deep Listening",
        description: "Presence, empathy, being with someone in pain without trying to fix.",
        searchQuery: "deep listening presence empathy compassionate listening",
        tags: ["communication"],
      },
      {
        title: "Loving-Kindness in Action",
        description: "Metta practice extended to others, dana (generosity), seva (service).",
        searchQuery: "metta loving-kindness dana generosity service",
        tags: ["metta", "dana"],
      },
      {
        title: "Wise Speech",
        description: "Right speech, how to talk to someone who is suffering or dying.",
        searchQuery: "right speech wise speech communication suffering",
        tags: ["speech"],
      },
      {
        title: "Boundaries & Self-Care",
        description: "Avoiding burnout, equanimity as balance, compassion fatigue.",
        searchQuery: "burnout equanimity balance self-care compassion fatigue",
        tags: ["equanimity"],
      },
      {
        title: "The Brahmaviharas",
        description: "The four sublime states — metta, karuna, mudita (sympathetic joy), upekkha (equanimity).",
        searchQuery: "brahmaviharas four sublime states metta karuna mudita upekkha",
        tags: ["brahmaviharas"],
      },
    ],
  },
  {
    slug: "beginning-the-path",
    title: "Beginning the Path",
    subtitle: "For complete beginners curious about Buddhism",
    icon: "compass",
    stages: [
      {
        title: "Who Was the Buddha?",
        description: "Historical context, the life of Siddhartha Gautama.",
        searchQuery: "life of the Buddha Siddhartha Gautama historical",
        tags: ["buddha"],
      },
      {
        title: "The Four Noble Truths",
        description: "Suffering, its origin, its cessation, and the path.",
        searchQuery: "four noble truths suffering origin cessation path",
        tags: ["four-noble-truths"],
      },
      {
        title: "The Eightfold Path",
        description: "Right view, intention, speech, action, livelihood, effort, mindfulness, concentration.",
        searchQuery: "noble eightfold path right view intention",
        tags: ["eightfold-path"],
      },
      {
        title: "Karma & Rebirth",
        description: "Actions and consequences, ethics as foundation.",
        searchQuery: "karma rebirth actions consequences Buddhist ethics",
        tags: ["karma"],
      },
      {
        title: "Meditation Basics",
        description: "Simple sitting practice, breath awareness, guided meditations.",
        searchQuery: "meditation basics beginner breathing sitting practice",
        tags: ["meditation"],
      },
      {
        title: "Going Deeper",
        description: "Choosing a tradition (Theravada, Mahayana, Vajrayana), finding a teacher, sangha.",
        searchQuery: "Buddhist traditions Theravada Mahayana Vajrayana teacher sangha",
        tags: ["theravada", "mahayana"],
      },
    ],
  },
  // --- Data-driven plans from cluster analysis (828 local suttas) ---
  {
    slug: "path-to-liberation",
    title: "The Path to Liberation",
    subtitle: "189 suttas on the stages of awakening and nibbana",
    icon: "sparkles",
    stages: [
      {
        title: "The Goal: Nibbana",
        description: "What is nibbana? The unconditioned, the deathless, the end of suffering.",
        searchQuery: "nibbana unconditioned deathless liberation",
        tags: ["nibbana"],
      },
      {
        title: "Stream-Entry & the Fetters",
        description: "The ten fetters (samyojana), stream-entry (sotapanna), and the stages of awakening.",
        searchQuery: "stream entry sotapanna fetters stages awakening",
        tags: ["stages"],
      },
      {
        title: "The Noble Eightfold Path in Depth",
        description: "Each factor of the path explored through the suttas — from right view to right concentration.",
        searchQuery: "eightfold path right view concentration factors",
        tags: ["path"],
      },
      {
        title: "The Seven Factors of Awakening",
        description: "Mindfulness, investigation, energy, joy, tranquility, concentration, equanimity.",
        searchQuery: "seven factors awakening bojjhanga",
        tags: ["path"],
      },
      {
        title: "Dependent Origination",
        description: "Paticca samuppada — the chain of dependent arising, how suffering originates and ceases.",
        searchQuery: "dependent origination paticca samuppada twelve links",
        tags: ["origination"],
      },
      {
        title: "Arahantship & Full Liberation",
        description: "The fully awakened mind — what the suttas say about the arahant's experience.",
        searchQuery: "arahant fully awakened liberation complete freedom",
        tags: ["nibbana", "stages"],
      },
    ],
  },
  {
    slug: "understanding-reality",
    title: "Understanding Reality",
    subtitle: "198 suttas on the nature of existence and right view",
    icon: "eye",
    stages: [
      {
        title: "The Three Characteristics",
        description: "Impermanence (anicca), suffering (dukkha), and non-self (anatta) — the marks of all conditioned things.",
        searchQuery: "three characteristics anicca dukkha anatta marks existence",
        tags: ["philosophy"],
      },
      {
        title: "The Five Aggregates",
        description: "Form, feeling, perception, formations, consciousness — deconstructing the self.",
        searchQuery: "five aggregates khandha form feeling perception consciousness",
        tags: ["philosophy"],
      },
      {
        title: "Emptiness & Non-Self",
        description: "Sunyata in early Buddhism — the emptiness of self in the Pali suttas.",
        searchQuery: "emptiness sunyata non-self anatta early Buddhism",
        tags: ["emptiness"],
      },
      {
        title: "Dependent Origination & Causality",
        description: "How things arise in dependence on conditions — the middle way between eternalism and nihilism.",
        searchQuery: "dependent origination causality middle way conditions",
        tags: ["origination"],
      },
      {
        title: "Right View",
        description: "Samma ditthi — understanding karma, the four noble truths, and seeing things as they really are.",
        searchQuery: "right view samma ditthi understanding reality",
        tags: ["view"],
      },
      {
        title: "Beyond Views",
        description: "Letting go of all views and opinions — the Buddha's teaching on not clinging to doctrines.",
        searchQuery: "letting go views opinions clinging doctrines atthakavagga",
        tags: ["view", "philosophy"],
      },
    ],
  },
  {
    slug: "ethics-right-living",
    title: "Ethics & Right Living",
    subtitle: "143 suttas on karma, sila, and the good life",
    icon: "scale",
    stages: [
      {
        title: "The Five Precepts",
        description: "The foundation of Buddhist ethics — not killing, not stealing, sexual responsibility, truthful speech, sobriety.",
        searchQuery: "five precepts sila Buddhist ethics foundation",
        tags: ["ethics"],
      },
      {
        title: "Karma: Actions & Consequences",
        description: "How intentional actions shape experience — the Buddha's nuanced teaching on karma.",
        searchQuery: "karma actions consequences intention kamma",
        tags: ["karma"],
      },
      {
        title: "Right Speech",
        description: "Truthful, harmonious, gentle, meaningful — the four qualities of right speech.",
        searchQuery: "right speech truthful harmonious gentle meaningful",
        tags: ["speech"],
      },
      {
        title: "Generosity & Giving",
        description: "Dana — the practice of generosity as the foundation of the spiritual life.",
        searchQuery: "dana generosity giving practice foundation",
        tags: ["ethics"],
      },
      {
        title: "Right Livelihood",
        description: "Earning a living without causing harm — the Buddha's guidance on ethical work.",
        searchQuery: "right livelihood ethical work trade profession",
        tags: ["ethics"],
      },
      {
        title: "The Lay Life",
        description: "Suttas addressed to householders — family, wealth, community, and spiritual growth in daily life.",
        searchQuery: "lay life householder family wealth community sigalovada",
        tags: ["ethics", "lay"],
      },
    ],
  },
  {
    slug: "the-buddha-his-world",
    title: "The Buddha & His World",
    subtitle: "140 suttas on the Buddha, his disciples, and their world",
    icon: "globe",
    stages: [
      {
        title: "The Life of the Buddha",
        description: "From prince to renunciant to awakened teacher — the Buddha's journey in his own words.",
        searchQuery: "life Buddha Siddhartha renunciation awakening",
        tags: ["buddha"],
      },
      {
        title: "The Great Disciples",
        description: "Sariputta, Moggallana, Ananda, Mahakassapa — the foremost disciples and their stories.",
        searchQuery: "great disciples Sariputta Moggallana Ananda foremost",
        tags: ["characters"],
      },
      {
        title: "Women in Early Buddhism",
        description: "The Therigatha — enlightenment poems of the first Buddhist nuns.",
        searchQuery: "therigatha nuns women early Buddhism enlightenment poems",
        tags: ["characters"],
      },
      {
        title: "Debates & Dialogues",
        description: "The Buddha in conversation — with brahmins, ascetics, kings, and skeptics.",
        searchQuery: "Buddha debate dialogue brahmins kings conversation",
        tags: ["characters"],
      },
      {
        title: "Cosmology & the Devas",
        description: "The Buddhist cosmos — realms of existence, devas, brahmas, and the wheel of life.",
        searchQuery: "cosmology devas brahmas realms existence wheel",
        tags: ["cosmology"],
      },
      {
        title: "The Last Days",
        description: "The Mahaparinibbana Sutta — the Buddha's final journey, teachings, and passing.",
        searchQuery: "mahaparinibbana last days Buddha final passing",
        tags: ["buddha"],
      },
    ],
  },
  {
    slug: "feelings-inner-life",
    title: "Feelings & the Inner Life",
    subtitle: "118 suttas on vedana, emotions, and inner transformation",
    icon: "heart",
    stages: [
      {
        title: "Understanding Vedana",
        description: "Pleasant, unpleasant, neutral — the three types of feeling and their role in liberation.",
        searchQuery: "vedana feeling pleasant unpleasant neutral three types",
        tags: ["feeling"],
      },
      {
        title: "The Mind & Its States",
        description: "Citta — understanding wholesome and unwholesome mind states.",
        searchQuery: "mind states citta wholesome unwholesome mental factors",
        tags: ["inner"],
      },
      {
        title: "Working with Hindrances",
        description: "The five hindrances — desire, ill-will, sloth, restlessness, doubt — and how to overcome them.",
        searchQuery: "five hindrances nivarana desire ill-will sloth restlessness doubt",
        tags: ["inner"],
      },
      {
        title: "Thought & Intention",
        description: "Vitakka — the role of thought in meditation and daily life, right intention.",
        searchQuery: "thought intention vitakka sankappa thinking meditation",
        tags: ["thought"],
      },
      {
        title: "Joy & Rapture",
        description: "Piti and sukha — cultivating wholesome joy as fuel for the path.",
        searchQuery: "joy rapture piti sukha wholesome happiness cultivation",
        tags: ["feeling"],
      },
      {
        title: "Equanimity",
        description: "Upekkha — the balanced mind that neither clings nor pushes away.",
        searchQuery: "equanimity upekkha balance neither clinging pushing",
        tags: ["feeling", "inner"],
      },
    ],
  },
  {
    slug: "imagery-poetry",
    title: "Imagery & Poetry of the Canon",
    subtitle: "141 suttas — the literary beauty of early Buddhist texts",
    icon: "feather",
    stages: [
      {
        title: "Similes of the Buddha",
        description: "The raft, the blind men and the elephant, the poisoned arrow — the Buddha's vivid teaching metaphors.",
        searchQuery: "simile metaphor raft blind elephant poisoned arrow parable",
        tags: ["imagery"],
      },
      {
        title: "The Dhammapada",
        description: "The most beloved collection of Buddhist verses — wisdom distilled into poetry.",
        searchQuery: "dhammapada verses wisdom poetry collection",
        tags: ["canonical-poetry"],
      },
      {
        title: "Songs of the Elders",
        description: "Theragatha — enlightenment poems of the first monks, nature imagery and liberation.",
        searchQuery: "theragatha elders monks poetry songs enlightenment",
        tags: ["canonical-poetry"],
      },
      {
        title: "Songs of the Elder Nuns",
        description: "Therigatha — powerful poems of awakening by the first Buddhist women.",
        searchQuery: "therigatha elder nuns women poetry awakening",
        tags: ["canonical-poetry"],
      },
      {
        title: "Nature & the Wild",
        description: "Forest dwellers, mountains, rivers — the natural world as teacher and refuge.",
        searchQuery: "forest nature wilderness solitude mountain river natural",
        tags: ["imagery"],
      },
      {
        title: "Cosmic Imagery",
        description: "Oceans of samsara, the wheel of life, Mount Meru — the grand scale of Buddhist vision.",
        searchQuery: "cosmic imagery ocean samsara wheel Mount Meru universe",
        tags: ["imagery", "cosmology"],
      },
    ],
  },
];

export function getStudyPlan(slug: string): StudyPlan | undefined {
  return STUDY_PLANS.find((p) => p.slug === slug);
}
