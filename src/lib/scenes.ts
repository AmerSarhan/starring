/**
 * Scene templates. Each prompt is written for Seedance 2.5 reference-to-video:
 * the selfie goes in `image_urls`, and the prompt refers to "the person in the
 * reference image" so the model keeps their face.
 */

export const SUBJECT = "the person from the reference image (keep their exact face, hair and likeness)";

export type Scene = {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  prompt: string;
  /** Default orientation for the scene. */
  aspect: "9:16" | "16:9";
};

export const SCENES: readonly Scene[] = [
  {
    id: "trailer",
    label: "Blockbuster trailer",
    emoji: "🎬",
    blurb: "Slow push-in, rain, one line of dialogue.",
    aspect: "16:9",
    prompt: `Cinematic movie trailer shot. ${SUBJECT} stands in a rain-soaked city street at night, neon reflections on wet asphalt, slow dolly push-in to a close-up, dramatic orchestral swell, they look up at the camera and say one quiet, determined line. Anamorphic lens, shallow depth of field, film grain.`,
  },
  {
    id: "f1",
    label: "F1 podium",
    emoji: "🏁",
    blurb: "Champagne, confetti, crowd roar.",
    aspect: "16:9",
    prompt: `${SUBJECT} as a Formula 1 driver in a race suit on the winner's podium, lifting a trophy while champagne sprays and confetti falls, roaring crowd, broadcast-style camera with a slow zoom, golden late-afternoon light, realistic sports coverage look.`,
  },
  {
    id: "astronaut",
    label: "Spacewalk",
    emoji: "🧑‍🚀",
    blurb: "Helmet visor up, Earth behind you.",
    aspect: "16:9",
    prompt: `${SUBJECT} as an astronaut floating outside a space station, visor open showing their face, Earth glowing blue behind them, slow rotating camera drift, soft radio chatter and breathing, photorealistic, IMAX documentary look.`,
  },
  {
    id: "anime",
    label: "Anime opening",
    emoji: "⚡",
    blurb: "Wind, hair, dramatic turn to camera.",
    aspect: "16:9",
    prompt: `Anime opening sequence. ${SUBJECT} drawn in high-quality anime style, standing on a rooftop at sunset as wind blows their hair, cherry blossom petals, they turn dramatically toward camera, speed lines, energetic J-rock music, vibrant saturated colors.`,
  },
  {
    id: "sitcom",
    label: "90s sitcom intro",
    emoji: "📺",
    blurb: "Freeze-frame, laugh track, your name card.",
    aspect: "16:9",
    prompt: `1990s sitcom opening credits. ${SUBJECT} walks into a brightly lit living room set, does a playful double take at the camera, laughs, then freeze-frames with a warm VHS glow and soft vignette, cheerful upbeat theme music with a laugh track, 4:3-era TV color grading.`,
  },
  {
    id: "perfume",
    label: "Luxury perfume ad",
    emoji: "✨",
    blurb: "Slow motion, silk, gold light.",
    aspect: "9:16",
    prompt: `High-end perfume commercial. ${SUBJECT} in elegant black attire, slow-motion turn as golden light sweeps across their face, silk fabric drifting in the air, a crystal bottle catches the light in the foreground, moody ambient soundtrack, editorial fashion cinematography.`,
  },
  {
    id: "rockstar",
    label: "Stadium rockstar",
    emoji: "🎸",
    blurb: "Spotlights, pyro, 50,000 fans.",
    aspect: "16:9",
    prompt: `${SUBJECT} as a rock star on a massive stadium stage, gripping a microphone, spotlights and pyrotechnics behind them, a sea of phone lights in the crowd, handheld concert camera pushing in, roaring live guitars and cheering.`,
  },
  {
    id: "western",
    label: "Western showdown",
    emoji: "🤠",
    blurb: "Dust, squint, hand on the holster.",
    aspect: "16:9",
    prompt: `Spaghetti western showdown at high noon. ${SUBJECT} in a dusty hat and poncho stands in an empty desert town street, extreme close-up on their squinting eyes, wind blows tumbleweed and dust, hand hovers over a holster, tense whistling score, sun-bleached 1960s film look.`,
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk street",
    emoji: "🌃",
    blurb: "Holograms, rain, neon reflections.",
    aspect: "9:16",
    prompt: `${SUBJECT} walks through a rainy cyberpunk megacity at night, towering holographic billboards, neon pink and cyan reflections on their face, steam rising from vents, slow tracking shot following them, synthwave soundtrack, Blade Runner-inspired cinematography.`,
  },
  {
    id: "nature",
    label: "Nature doc host",
    emoji: "🦁",
    blurb: "Whispering to camera on the savanna.",
    aspect: "16:9",
    prompt: `BBC-style nature documentary. ${SUBJECT} in khaki field clothes crouches in tall golden savanna grass at dawn, whispers excitedly to the camera while gesturing toward wildlife in the distance, handheld documentary camera, birdsong and wind, warm natural light.`,
  },
  {
    id: "news",
    label: "Breaking news anchor",
    emoji: "📰",
    blurb: "Studio desk, lower third, urgent tone.",
    aspect: "16:9",
    prompt: `Live television news broadcast. ${SUBJECT} as a news anchor at a sleek studio desk with a large BREAKING NEWS graphic behind them, speaking urgently to the camera, studio lighting, subtle camera zoom, broadcast-quality look with a lower-third graphic.`,
  },
  {
    id: "superhero",
    label: "Superhero landing",
    emoji: "🦸",
    blurb: "Crater, cape, slow rise.",
    aspect: "16:9",
    prompt: `${SUBJECT} as a superhero lands hard on a city street creating a small crater, debris flying, cape settling, they slowly rise and look at the camera with resolve, low-angle heroic shot, epic orchestral hit, blockbuster VFX look.`,
  },
  {
    id: "runway",
    label: "Fashion runway",
    emoji: "👠",
    blurb: "Paris show, flashes, front row.",
    aspect: "9:16",
    prompt: `Paris fashion week runway. ${SUBJECT} in an avant-garde designer outfit walks confidently toward the camera down a long runway, camera flashes from the front row, dramatic spotlights, deep house soundtrack, high-fashion editorial video.`,
  },
  {
    id: "chef",
    label: "Cooking show",
    emoji: "🍳",
    blurb: "Flambé, smile, tasting spoon.",
    aspect: "16:9",
    prompt: `Cooking show host segment. ${SUBJECT} in a chef's apron flambés a pan in a bright modern kitchen studio, flames leap up, they grin at the camera and taste from a spoon, sizzling sounds and upbeat music, polished food-TV cinematography.`,
  },
  {
    id: "underwater",
    label: "Deep dive",
    emoji: "🐠",
    blurb: "Sunbeams, bubbles, a manta ray.",
    aspect: "9:16",
    prompt: `${SUBJECT} as a free diver gliding through crystal-clear tropical water, sunbeams cutting through the surface, schools of fish and a manta ray passing overhead, bubbles rising, muffled underwater ambience, cinematic slow motion.`,
  },
  {
    id: "custom",
    label: "Write your own",
    emoji: "✍️",
    blurb: "Describe any scene. We keep your face.",
    aspect: "16:9",
    prompt: "",
  },
];

export const SCENE_MAP = new Map(SCENES.map((s) => [s.id, s]));

export function buildPrompt(sceneId: string, custom?: string): { prompt: string; label: string } | null {
  const scene = SCENE_MAP.get(sceneId);
  if (!scene) return null;
  if (scene.id === "custom") {
    const text = (custom ?? "").trim();
    if (text.length < 8) return null;
    return {
      label: "Custom scene",
      prompt: `${SUBJECT} ${text}. Photorealistic, cinematic lighting, natural motion, synchronized audio.`,
    };
  }
  return { label: scene.label, prompt: scene.prompt };
}
