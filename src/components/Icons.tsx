import React from "react";
import {
  Cpu,
  Palette,
  Wrench,
  BookOpen,
  Sparkles,
  Folder,
  Globe,
  Code,
  Rocket,
  Star,
  Hash,
  Bookmark,
  Compass,
  Layers,
  LucideProps,
} from "lucide-react";

interface CategoryIconProps extends LucideProps {
  name: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  switch (name.toLowerCase()) {
    case "cpu":
      return <Cpu {...props} />;
    case "palette":
      return <Palette {...props} />;
    case "wrench":
      return <Wrench {...props} />;
    case "bookopen":
    case "book":
      return <BookOpen {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "code":
      return <Code {...props} />;
    case "rocket":
      return <Rocket {...props} />;
    case "star":
      return <Star {...props} />;
    case "globe":
      return <Globe {...props} />;
    case "compass":
      return <Compass {...props} />;
    case "layers":
      return <Layers {...props} />;
    case "bookmark":
      return <Bookmark {...props} />;
    default:
      return <Folder {...props} />;
  }
};

export const AVAILABLE_ICONS = [
  "Cpu",
  "Palette",
  "Wrench",
  "BookOpen",
  "Sparkles",
  "Code",
  "Rocket",
  "Globe",
  "Compass",
  "Layers",
  "Bookmark",
  "Folder",
];
