import { Category, AnalyzedLink } from "@/types";

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-ai",
    name: "AI & Intelligence",
    icon: "Cpu",
    color: "purple",
    description: "LLMs, Neural Systems & Autonomous Agents",
    createdAt: Date.now() - 1000000,
  },
  {
    id: "cat-design",
    name: "Design & Glass UI",
    icon: "Palette",
    color: "rose",
    description: "UI/UX, Frosted Glass, Aesthetics & Motion",
    createdAt: Date.now() - 900000,
  },
  {
    id: "cat-tools",
    name: "Dev Tools & Code",
    icon: "Wrench",
    color: "cyan",
    description: "Libraries, Frameworks, CLIs & Infrastructure",
    createdAt: Date.now() - 800000,
  },
  {
    id: "cat-reads",
    name: "Deep Reads & Papers",
    icon: "BookOpen",
    color: "emerald",
    description: "Whitepapers, Research, Essays & Philosophy",
    createdAt: Date.now() - 700000,
  },
  {
    id: "cat-ideas",
    name: "Product & Strategy",
    icon: "Sparkles",
    color: "amber",
    description: "Startup playbooks, Growth & Product Architecture",
    createdAt: Date.now() - 600000,
  },
];

export const INITIAL_LINKS: AnalyzedLink[] = [
  {
    id: "link-sample-5",
    url: "https://www.youtube.com/shorts/q3B3Y92i7bM",
    title: "Corian Marble Temple & Custom Craftsmanship",
    description:
      "Handcrafted corian and Makrana marble mandirs with custom backlighting and CNC engraving. Direct artisan studio contact details.",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1000&auto=format&fit=crop",
    favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
    siteName: "YouTube Shorts",
    author: "Explore With Jasir",
    publishedDate: "2024",
    categoryId: "cat-ideas",
    isFavorite: true,
    isPinned: true,
    aiSummary: {
      tldr: "Artisan showcase of premium Corian marble mandirs featuring custom CNC jaali work, built-in ambient lighting, and direct workshop ordering.",
      keyTakeaways: [
        "🎥 Video Focus / What it's about: Demonstration of custom-carved Corian marble home mandirs with seamless backlighting and acrylic inlays",
        "📞 Contact & On-Screen Details: Phone: +91 98110 54321 • WhatsApp: +91 98110 54321 • Location: Marble Art Studio, Rajasthan",
        "Materials used: Pure white Corian solid surface paired with Makrana marble accents for durability and stain resistance",
        "Customization options: Sizing from 3ft to 8ft with customized deities engraving and warm LED ambient halo"
      ],
      detailedSummary:
        "This video demonstration highlights modern Corian marble temple designs suited for contemporary apartments and homes. The creator showcases the CNC fretwork (jaali), solid-surface build quality, and easy-clean maintenance.\n\nFlashed on-screen contact numbers allow direct consultation with the artisans for custom dimensions, shipping across India, and installation.",
      actionableInsights: [
        "Inquire with workshop via WhatsApp (+91 98110 54321) for dimensions and pan-India wooden crate shipping.",
        "Specify warm white (3000K) LED concealed strip for optimum Corian translucent glow."
      ],
      tags: ["youtube-short", "mandir", "corian-temple", "interior-design", "marble-art"],
      contentType: "video",
      estimatedReadTime: "1 min short",
      isAiGenerated: true,
      contacts: {
        phoneNumbers: ["+91 98110 54321"],
        emails: ["mandir.artisans@gmail.com"],
        links: ["https://youtube.com/@explorewithjasir"],
        whatsappOrSocials: ["+91 98110 54321", "@explorewithjasir"],
        addressOrLocation: "Marble Art Studio, Makrana Road, Rajasthan, India",
        pricingOrOffers: "Custom temples starting from ₹18,500 with pan-India delivery",
      },
      spokenOrOnScreenContent:
        "Flashed on screen: 'Call or WhatsApp: +91 98110 54321 for catalogue and custom orders'. Spoken details cover marble thickness, waterproof guarantees, and doorstep installation.",
    },
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: "link-sample-4",
    url: "https://www.youtube.com/watch?v=D56_CX3636Q",
    title: "Google Gemini 2.0: Next-Gen Multimodal AI Capabilities & Demos",
    description:
      "A complete walkthrough and live demonstration of Gemini 2.0 Flash executing low-latency spatial reasoning, vision assistance, and voice dialogue.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
    siteName: "YouTube",
    author: "Google",
    publishedDate: "2024",
    categoryId: "cat-ai",
    isFavorite: true,
    isPinned: true,
    aiSummary: {
      tldr: "Live keynote and technical demonstration presenting Gemini 2.0's real-time voice, vision streaming, and tool execution.",
      keyTakeaways: [
        "🎥 Video Focus / What it's about: Real-time demonstration of Gemini 2.0 Flash executing native multimodal voice and vision dialogue with sub-second response times",
        "📞 Contact & On-Screen Details: Phone: +1 (650) 253-0000 • Email: cloud-ai-support@google.com • Location: Mountain View, CA",
        "Introduces agentic workflows connecting Gemini directly to search, Python interpreters, and custom APIs",
        "Highlights edge and mobile device performance optimizations for interactive consumer applications"
      ],
      detailedSummary:
        "This video demonstration showcases Gemini 2.0's end-to-end multimodal architecture in action. The presenters walk through interactive scenarios where the model observes continuous camera feeds, understands spatial physical orientation, and responds conversationally without noticeable lag.\n\nKey segments illustrate how developers can leverage low-latency WebSockets to build voice agents, live screen-sharing tutors, and multi-tool orchestration pipelines.",
      actionableInsights: [
        "Explore real-time audio/video streaming via the Gemini Multimodal Live API.",
        "Implement tool-calling wrappers for external API orchestration in interactive applications."
      ],
      tags: ["youtube", "video", "gemini-2", "live-demo", "ai-agents"],
      contentType: "video",
      estimatedReadTime: "8 min watch",
      isAiGenerated: true,
      contacts: {
        phoneNumbers: ["+1 (650) 253-0000"],
        emails: ["cloud-ai-support@google.com"],
        links: ["https://ai.google.dev", "https://deepmind.google/gemini"],
        whatsappOrSocials: ["@GoogleDeepMind", "@GoogleCloud"],
        addressOrLocation: "Googleplex, 1600 Amphitheatre Pkwy, Mountain View, CA",
        pricingOrOffers: "Gemini 2.0 Flash: Free tier available on Google AI Studio",
      },
      spokenOrOnScreenContent:
        "Spoken dialogue & visual demonstration presented by Google DeepMind engineers. Covers live camera reasoning, on-screen Python code debugging, real-time spatial object tracking, and low-latency voice synthesis.",
    },
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
  },
  {
    id: "link-sample-1",
    url: "https://deepmind.google/technologies/gemini/",
    title: "Gemini: Google's Next-Generation Multimodal AI Models",
    description:
      "Gemini is built from the ground up for multimodality — reasoning seamlessly across text, images, video, audio, and code.",
    image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1000&auto=format&fit=crop",
    favicon: "https://www.google.com/s2/favicons?domain=deepmind.google&sz=128",
    siteName: "Google DeepMind",
    author: "Google DeepMind Team",
    publishedDate: "2024",
    categoryId: "cat-ai",
    isFavorite: true,
    isPinned: false,
    aiSummary: {
      tldr: "Google's flagship multimodal model family engineered for high-speed reasoning across text, code, audio, and visual inputs.",
      keyTakeaways: [
        "📌 Topic / What this is about: Comprehensive architecture and technical benchmarks for Google's native multimodal AI model family",
        "Native multimodality trained from scratch on diverse modalities rather than stitched components",
        "Exceptional reasoning in coding benchmarks, visual comprehension, and mathematics",
        "Massive context window allowing analysis of extensive video clips, books, and codebases in a single shot"
      ],
      detailedSummary:
        "DeepMind's Gemini represents a major milestone in foundation model architecture. Rather than training separate vision and speech encoders that bolt onto a text language model, Gemini was trained natively across modalities. This allows it to understand complex visual relationships, interpret diagrams in real-time, and cross-reference audio with video with unprecedented latency efficiency.\n\nIts long-context capabilities enable deep agentic interactions, whole-codebase understanding, and complex multi-modal workflows across both personal assistant interfaces and enterprise systems.",
      actionableInsights: [
        "Adopt Gemini 2.0 Flash for sub-second agentic workflows and tool-calling pipelines.",
        "Take advantage of native video analysis capabilities to inspect UI recordings and UX walkthroughs."
      ],
      tags: ["multimodal", "deepmind", "gemini", "ai-agents", "reasoning"],
      contentType: "article",
      estimatedReadTime: "4 min read",
      isAiGenerated: true,
    },
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000,
  },
  {
    id: "link-sample-2",
    url: "https://github.com/shadcn-ui/ui",
    title: "shadcn/ui: Beautifully Designed Accessible Components",
    description:
      "A collection of re-usable components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1000&auto=format&fit=crop",
    favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=128",
    siteName: "GitHub",
    author: "shadcn",
    categoryId: "cat-tools",
    isFavorite: true,
    isPinned: false,
    aiSummary: {
      tldr: "The leading component distribution pattern that gives developers complete ownership of their UI code with Tailwind and Radix primitives.",
      keyTakeaways: [
        "📦 Project Focus / What it is: A modular component design system where accessible React components are copied directly into the project codebase",
        "Built on top of Radix UI primitives ensuring complete keyboard navigation and WCAG accessibility",
        "Styled using Tailwind CSS for intuitive custom styling and theming",
        "Widely adopted across modern Next.js and React ecosystems"
      ],
      detailedSummary:
        "shadcn/ui shifted the web UI paradigm from rigid NPM component libraries to owned, composable source code. By leveraging CLI scaffolding to drop components straight into your project's components folder, developers gain unhindered control over markup, styling, and behavior.",
      actionableInsights: [
        "Use shadcn/ui when building design systems requiring custom glass or brand-specific variants without upstream conflicts."
      ],
      tags: ["react", "tailwind", "ui-components", "design-system"],
      contentType: "repository",
      estimatedReadTime: "3 min read",
      isAiGenerated: true,
    },
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 400000,
  },
  {
    id: "link-sample-3",
    url: "https://uxdesign.cc/the-evolution-of-glassmorphism-ui",
    title: "The Evolution of Glassmorphism in Modern Interface Design",
    description:
      "How translucent frosted glass, subtle borders, and vivid ambient gradients created a sophisticated spatial computing aesthetic.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    favicon: "https://www.google.com/s2/favicons?domain=uxdesign.cc&sz=128",
    siteName: "UX Collective",
    author: "Elena Rostova",
    categoryId: "cat-design",
    isFavorite: false,
    isPinned: false,
    aiSummary: {
      tldr: "An exploration into how backdrop filters, translucent materials, and multi-layered depth define futuristic, tactile digital products.",
      keyTakeaways: [
        "📌 Topic / What this is about: Design analysis on how backdrop blur, ambient neon lighting, and frosted materials create tactile spatial interfaces",
        "Backdrop blur creates visual hierarchy without obstructing background context",
        "Subtle 1px translucent borders establish crisp edge definition against complex backgrounds",
        "Multi-layer depth simulates physical glass planes, creating a spatial computing feel"
      ],
      detailedSummary:
        "Glassmorphism has evolved from a visual novelty into an essential UI design language for spatial computing and luxury software. Modern implementations pair multi-directional frosted blur with neon aurora ambient lighting to produce vibrant, tactile, and highly legible interfaces.",
      actionableInsights: [
        "Ensure backdrop blur has sufficient contrast against high-density text for accessibility.",
        "Add subtle inner borders (rgba 255,255,255,0.15) to maintain card definition over varying backgrounds."
      ],
      tags: ["glassmorphism", "ui-design", "ambient-ui", "ux-trends"],
      contentType: "article",
      estimatedReadTime: "5 min read",
      isAiGenerated: true,
    },
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000,
  },
];

const STORAGE_KEYS = {
  CATEGORIES: "albo_categories_v1",
  LINKS: "albo_links_v1",
  API_KEY: "albo_gemini_api_key_v1",
};

export function getStoredCategories(userEmail?: string | null): Category[] {
  if (typeof window === "undefined") return INITIAL_CATEGORIES;
  try {
    const key = userEmail
      ? `albo_cats_user_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
      : STORAGE_KEYS.CATEGORIES;
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(item);
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveStoredCategories(categories: Category[], userEmail?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = userEmail
      ? `albo_cats_user_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
      : STORAGE_KEYS.CATEGORIES;
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (e) {
    console.error("Failed to save categories to localStorage", e);
  }
}

export function getStoredLinks(userEmail?: string | null): AnalyzedLink[] {
  if (typeof window === "undefined") return userEmail ? [] : INITIAL_LINKS;

  // For logged in user: strictly load their own personal links (starts blank!)
  if (userEmail) {
    try {
      const key = `albo_links_user_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const item = localStorage.getItem(key);
      if (!item) {
        // Brand new login: start with completely blank list!
        return [];
      }
      const parsed: AnalyzedLink[] = JSON.parse(item);
      // Ensure no demo sample links leak in
      return parsed.filter((l) => !l.id.startsWith("link-sample-"));
    } catch {
      return [];
    }
  }

  // For Guest / Unauthenticated users: show demo showcase
  try {
    const item = localStorage.getItem(STORAGE_KEYS.LINKS);
    if (!item) {
      localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(INITIAL_LINKS));
      return INITIAL_LINKS;
    }
    let parsed: AnalyzedLink[] = JSON.parse(item);
    let needsSave = false;

    // 1. Ensure link-sample-5 (Short with contacts) is present
    if (!parsed.some((l) => l.id === "link-sample-5")) {
      const sample5 = INITIAL_LINKS.find((l) => l.id === "link-sample-5");
      if (sample5) {
        parsed = [sample5, ...parsed];
        needsSave = true;
      }
    }

    // 2. Ensure link-sample-4 is present and has contact numbers
    const sample4 = INITIAL_LINKS.find((l) => l.id === "link-sample-4");
    if (sample4) {
      const idx4 = parsed.findIndex((l) => l.id === "link-sample-4");
      if (idx4 === -1) {
        parsed = [sample4, ...parsed];
        needsSave = true;
      } else if (!parsed[idx4].aiSummary.contacts?.phoneNumbers?.length) {
        parsed[idx4] = sample4;
        needsSave = true;
      }
    }

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return INITIAL_LINKS;
  }
}

export function saveStoredLinks(links: AnalyzedLink[], userEmail?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userEmail) {
      const key = `albo_links_user_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      // Never store sample demo links in user account
      const realLinks = links.filter((l) => !l.id.startsWith("link-sample-"));
      localStorage.setItem(key, JSON.stringify(realLinks));
    } else {
      localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
    }
  } catch (e) {
    console.error("Failed to save links to localStorage", e);
  }
}

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

export function saveStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
}
