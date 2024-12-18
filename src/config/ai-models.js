import { 
  Bot, 
  Sparkles, 
  Rocket, 
  Code2, 
  Gamepad2, 
  Search,
  Music,
  Image as ImageIcon,
  Skull,
  Cpu,
  Wand2,
  Lightbulb,
  Lock,
  Unlock,
  Zap,
  BrainCircuit,
  MessageSquare,
  FileCode,
  Palette,
  Globe,
  FlaskConical,
  Blocks,
  Binary,
  Atom
} from "lucide-react";

export const MODELS = [
  {
    name: "openai",
    displayName: "OpenAI GPT-4",
    type: "chat",
    censored: true,
    description: "OpenAI GPT-4o",
    baseModel: true,
    features: ["Most Accurate", "Fastest Response", "Best Overall"],
    icon: Bot,
    color: "text-green-500"
  },
  {
    name: "mistral",
    displayName: "Mistral Nemo",
    type: "chat",
    censored: false,
    description: "Mistral Nemo",
    baseModel: true,
    features: ["Open Source", "Efficient", "Balanced"],
    icon: Sparkles,
    color: "text-purple-500"
  },
  {
    name: "mistral-large",
    displayName: "Mistral Large",
    type: "chat",
    censored: false,
    description: "Mistral Large (v2)",
    baseModel: true,
    features: ["Enhanced Context", "Advanced Reasoning"],
    icon: Rocket,
    color: "text-blue-500"
  },
  {
    name: "llama",
    displayName: "Llama 3.1",
    type: "completion",
    censored: true,
    description: "Llama 3.1",
    baseModel: true,
    features: ["Text Completion", "Large Context Window"],
    icon: BrainCircuit,
    color: "text-orange-500"
  },
  {
    name: "command-r",
    displayName: "Command-R",
    type: "chat",
    censored: false,
    description: "Command-R",
    baseModel: false,
    features: ["Command Line", "System Operations"],
    icon: Binary,
    color: "text-indigo-500"
  },
  {
    name: "unity",
    displayName: "Unity AI",
    type: "chat",
    censored: false,
    description: "Unity with Mistral Large by Unity AI Lab",
    baseModel: false,
    features: ["Game Development", "Asset Creation"],
    icon: Gamepad2,
    color: "text-pink-500"
  },
  {
    name: "midijourney",
    displayName: "Midijourney",
    type: "chat",
    censored: true,
    description: "Midijourney musical transformer",
    baseModel: false,
    features: ["Music Generation", "Audio Analysis"],
    icon: Music,
    color: "text-yellow-500"
  },
  {
    name: "rtist",
    displayName: "Rtist",
    type: "chat",
    censored: true,
    description: "Rtist image generator by @bqrio",
    baseModel: false,
    features: ["Image Generation", "Art Creation"],
    icon: Palette,
    color: "text-cyan-500"
  },
  {
    name: "searchgpt",
    displayName: "SearchGPT",
    type: "chat",
    censored: true,
    description: "SearchGPT with realtime news and web search",
    baseModel: false,
    features: ["Real-time Search", "News Analysis"],
    icon: Globe,
    color: "text-sky-500"
  },
  {
    name: "evil",
    displayName: "Evil Mode",
    type: "chat",
    censored: false,
    description: "Evil Mode - Experimental",
    baseModel: false,
    features: ["Experimental", "Uncensored"],
    icon: Skull,
    color: "text-red-500"
  },
  {
    name: "qwen-coder",
    displayName: "Qwen Coder",
    type: "chat",
    censored: true,
    description: "Qwen Coder 32b Instruct (Supposedly better than GPT-4o at coding)",
    baseModel: true,
    features: ["Code Generation", "Technical Documentation"],
    icon: FileCode,
    color: "text-emerald-500"
  },
  {
    name: "p1",
    displayName: "Pollinations 1",
    type: "chat",
    censored: false,
    description: "Pollinations 1 (OptiLLM)",
    baseModel: false,
    features: ["Optimized LLM", "Research Focus"],
    icon: FlaskConical,
    color: "text-violet-500"
  }
];

export const MODEL_GROUPS = {
  'Base Models': MODELS.filter(m => m.baseModel),
  'Specialized': MODELS.filter(m => !m.baseModel && m.name !== 'evil'),
  'Experimental': MODELS.filter(m => m.name === 'evil')
};

export const getModelById = (id) => MODELS.find(m => m.name === id) || MODELS[0];
export const getDefaultModel = () => MODELS[0];

export const MODEL_TYPE_ICONS = {
  chat: MessageSquare,
  completion: Blocks
};

export const SECURITY_ICONS = {
  censored: Lock,
  uncensored: Unlock
};

export const SECURITY_COLORS = {
  censored: "text-yellow-500",
  uncensored: "text-red-500"
};
