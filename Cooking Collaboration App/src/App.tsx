import { useEffect, useRef, useState } from "react";
import cookingGeniusLogo from "./assets/cooking-genius-logo.png";

type Screen =
  | "home"
  | "camera"
  | "text"
  | "recipes"
  | "instructions"
  | "tasks"
  | "summary"
  | "calendar"
  | "settings";

type IconName =
  | "menu"
  | "arrow"
  | "camera"
  | "text"
  | "clock"
  | "spark"
  | "plus"
  | "filter"
  | "lock"
  | "check"
  | "flame"
  | "star"
  | "copy"
  | "home"
  | "calendar"
  | "settings"
  | "user"
  | "close"
  | "chef"
  | "chevron";

const photos = [
  {
    url: "https://images.unsplash.com/photo-1535473895227-bdecb20fb157?auto=format&fit=crop&w=1200&q=85",
    alt: "Colorful vegetable dishes arranged on a table",
    label: "Big flavor, tiny kitchen",
  },
  {
    url: "https://images.unsplash.com/photo-1687184412163-09d005f5caa2?auto=format&fit=crop&w=1200&q=85",
    alt: "Fresh vegetable grain bowl",
    label: "Use what you already have",
  },
  {
    url: "https://images.unsplash.com/photo-1602097944182-c43423a8056d?auto=format&fit=crop&w=1200&q=85",
    alt: "Freshly cooked meal on a ceramic plate",
    label: "Cook better, together",
  },
];

type Recipe = {
  name: string;
  match: string;
  time: string;
  tag: string;
  image: string;
  ingredients: string[];
  description: string;
  method: string;
  steps: { title: string; instruction: string; duration: string }[];
};

const recipes: Recipe[] = [
  {
    name: "Crispy Garden Tacos",
    match: "96% INGREDIENT MATCH",
    time: "25 min",
    tag: "Best match",
    image: photos[0].url,
    ingredients: ["bell pepper", "red onion", "chickpeas", "tortillas", "lime"],
    description: "Charred vegetables, crispy chickpeas, lime crema, and warm tortillas. Fast, flexible, and built for sharing.",
    method: "Slice the vegetables and sauté until tender with browned edges. Crisp the chickpeas in the pan, warm the tortillas, then fill and finish with lime.",
    steps: [
      { title: "Prep the vegetables", instruction: "Slice the bell pepper and red onion into even strips.", duration: "5 min" },
      { title: "Crisp the chickpeas", instruction: "Warm a little oil in a pan and cook the chickpeas until golden and crisp.", duration: "6 min" },
      { title: "Sauté the vegetables", instruction: "Add the pepper and onion to the pan and cook until tender with browned edges.", duration: "7 min" },
      { title: "Warm the tortillas", instruction: "Warm the tortillas in a dry pan until soft and lightly toasted.", duration: "3 min" },
      { title: "Assemble and serve", instruction: "Fill each tortilla, finish with lime, and serve while warm.", duration: "4 min" },
    ],
  },
  {
    name: "Golden Veggie Bowl",
    match: "91% INGREDIENT MATCH",
    time: "20 min",
    tag: "Quick",
    image: photos[1].url,
    ingredients: ["seasonal vegetables", "rice", "olive oil", "lemon"],
    description: "A quick grain bowl with warm vegetables and a bright, simple dressing.",
    method: "Cook the rice. Sauté chopped vegetables in olive oil until tender, then serve over rice with lemon and seasoning.",
    steps: [
      { title: "Rinse the rice", instruction: "Rinse the rice under cool water until the water runs mostly clear.", duration: "2 min" },
      { title: "Cook the rice", instruction: "Cook the rice according to its package directions.", duration: "15 min" },
      { title: "Chop the vegetables", instruction: "Cut the vegetables into bite-size pieces so they cook evenly.", duration: "4 min" },
      { title: "Sauté the vegetables", instruction: "Heat olive oil in a pan and cook the vegetables until tender.", duration: "8 min" },
      { title: "Dress and serve", instruction: "Spoon the vegetables over rice and finish with lemon and seasoning.", duration: "2 min" },
    ],
  },
  {
    name: "Pantry Crunch Plate",
    match: "86% INGREDIENT MATCH",
    time: "30 min",
    tag: "Low waste",
    image: photos[2].url,
    ingredients: ["seasonal vegetables", "beans", "bread or grains", "pantry seasoning"],
    description: "A flexible, low-waste plate for using up vegetables and pantry staples.",
    method: "Roast or pan-sear chopped vegetables until golden. Add warmed beans and serve with bread or grains.",
    steps: [
      { title: "Preheat the oven", instruction: "Heat the oven to 425°F (220°C), or warm a large pan over medium heat.", duration: "5 min" },
      { title: "Prepare the vegetables", instruction: "Chop the vegetables into similar-sized pieces.", duration: "5 min" },
      { title: "Season and cook", instruction: "Toss the vegetables with oil and seasoning, then roast or pan-sear until golden.", duration: "18 min" },
      { title: "Warm the beans", instruction: "Warm the beans in a small pan or add them to the vegetables for the last few minutes.", duration: "4 min" },
      { title: "Plate the meal", instruction: "Serve the vegetables and beans with bread or cooked grains.", duration: "3 min" },
    ],
  },
];

type FoodDetection = { label: string; bbox: [number, number, number, number] };
type FoodScan = {
  imageUrl: string;
  imageSize: { width: number; height: number };
  detections: FoodDetection[];
};
type CookResult = {
  score: number;
  completed_steps: number;
  total_steps: number;
};

function generateRecipes(detections: FoodDetection[]): Recipe[] {
  const ingredients = [...new Set(
    detections
      .map(({ label }) => label.trim().toLowerCase())
      .filter(Boolean),
  )];
  if (ingredients.length === 0) return [];

  const featured = ingredients.slice(0, 3);
  const titleIngredients = featured.slice(0, 2).map((item) => item.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const ingredientList = [...featured, "oil", "salt", "pepper"];
  const first = titleIngredients[0];
  const second = titleIngredients[1];
  return [
    {
      name: `Quick ${first} Skillet`,
      match: "MADE FROM YOUR SCAN",
      time: "20 min",
      tag: "Quick",
      image: photos[1].url,
      ingredients: ingredientList,
      description: `A simple one-pan idea featuring ${featured.join(", ")}.`,
      method: `Chop the detected ingredients into bite-size pieces. Warm a little oil in a skillet, cook the firmest ingredients first, then add the rest and sauté until tender. Season to taste.`,
      steps: [
        { title: "Prepare the ingredients", instruction: `Wash and chop ${featured.join(", ")} into bite-size pieces.`, duration: "5 min" },
        { title: "Heat the skillet", instruction: "Warm a little oil in a skillet over medium heat.", duration: "2 min" },
        { title: "Cook the firm ingredients", instruction: "Add the firmest chopped ingredients first and cook until they begin to soften.", duration: "6 min" },
        { title: "Finish cooking", instruction: "Add the remaining ingredients and sauté until everything is tender.", duration: "6 min" },
        { title: "Season and serve", instruction: "Season to taste and serve warm.", duration: "1 min" },
      ],
    },
    {
      name: `${first}${second ? ` & ${second}` : ""} Roast Bowl`,
      match: "MADE FROM YOUR SCAN",
      time: "30 min",
      tag: "One-pan",
      image: photos[0].url,
      ingredients: [...featured, "grains or bread", "oil", "salt", "pepper"],
      description: `A flexible roasted bowl built around ${featured.join(", ")}.`,
      method: `Cut the detected ingredients into similar-sized pieces, toss with oil, salt, and pepper, then roast at 425°F (220°C) until tender and browned. Serve with cooked grains or bread.`,
      steps: [
        { title: "Preheat the oven", instruction: "Heat the oven to 425°F (220°C).", duration: "5 min" },
        { title: "Prepare the ingredients", instruction: `Cut ${featured.join(", ")} into similar-sized pieces.`, duration: "5 min" },
        { title: "Season the vegetables", instruction: "Toss with oil, salt, and pepper until evenly coated.", duration: "2 min" },
        { title: "Roast until golden", instruction: "Spread on a baking sheet and roast until tender and browned.", duration: "20 min" },
        { title: "Build the bowl", instruction: "Serve the roasted ingredients with cooked grains or bread.", duration: "3 min" },
      ],
    },
    {
      name: `${first} Pantry Soup`,
      match: "MADE FROM YOUR SCAN",
      time: "35 min",
      tag: "Comforting",
      image: photos[2].url,
      ingredients: [...featured, "broth or water", "onion or garlic", "oil"],
      description: `A cozy soup suggestion using ${featured.join(", ")} and basic pantry staples.`,
      method: `Soften onion or garlic in a little oil if available. Add chopped detected ingredients and enough broth or water to cover. Simmer until everything is tender, then season to taste.`,
      steps: [
        { title: "Prepare the ingredients", instruction: `Chop ${featured.join(", ")} into bite-size pieces.`, duration: "5 min" },
        { title: "Soften aromatics", instruction: "Warm a little oil in a pot and soften onion or garlic if available.", duration: "4 min" },
        { title: "Add the vegetables", instruction: "Stir in the chopped ingredients and cook for a few minutes.", duration: "4 min" },
        { title: "Add broth and simmer", instruction: "Pour in enough broth or water to cover, then simmer until the vegetables are tender.", duration: "18 min" },
        { title: "Season the soup", instruction: "Taste and adjust with salt, pepper, or other pantry seasoning.", duration: "2 min" },
        { title: "Serve warm", instruction: "Ladle into bowls and serve.", duration: "2 min" },
      ],
    },
  ];
}

const fastFoodPickupEstimate = 40;

function getRecipeTimeMinutes(recipe: Recipe | null): number {
  const minutes = Number.parseInt(recipe?.time ?? "", 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 25;
}

function getMealBenefits(recipe: Recipe | null): string[] {
  const ingredients = (recipe?.ingredients ?? []).join(" ").toLowerCase();
  const benefits: string[] = [];
  if (/\b(vegetables?|veggies|spinach|broccoli|carrot|pepper|tomato|onion|cabbage|squash|asparagus|greens)\b/.test(ingredients)) {
    benefits.push("Vegetables contribute fiber and a range of vitamins and minerals.");
  }
  if (/\b(chickpeas|chickpea|beans|black beans|lentils|peas)\b/.test(ingredients)) {
    benefits.push("Beans and chickpeas add plant-based protein and fiber.");
  }
  if (/\b(whole grains|whole grain|quinoa|brown rice|oats)\b/.test(ingredients)) {
    benefits.push("Whole grains can add fiber to help make the meal more filling.");
  }
  benefits.push("Cooking at home lets you adjust added salt, oil, and portions.");
  return benefits;
}

const florenceApiUrl = import.meta.env.VITE_FLORENCE_API_URL ?? "http://localhost:8000";
const maxImageSize = 10 * 1024 * 1024;

const Icon = ({ name, size = 22 }: { name: IconName; size?: number }) => {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <><path d="M4 7h16M4 12h12M4 17h16" /></>,
    arrow: <><path d="m15 18-6-6 6-6" /></>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" /><circle cx="12" cy="13" r="3.5" /></>,
    text: <><path d="M5 6h14M5 10h14M5 14h9M5 18h12" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    flame: <><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-1 2-2 3-3 4-1-3-3-5-4-6 0 4-3 7-3 12a7 7 0 0 0 7 7Z" /><path d="M12 22a3 3 0 0 0 3-3c0-2-2-3-3-5-1 2-3 3-3 5a3 3 0 0 0 3 3Z" /></>,
    star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.64 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.64h.01A1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.36 9v.01A1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chef: <><path d="M7 10a4 4 0 0 1 1-7.87A5 5 0 0 1 17 4a3.5 3.5 0 0 1 0 7H7Z" /><path d="M7 10v10h10V10M7 16h10" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

function AppHeader({ openMenu }: { openMenu: () => void }) {
  return (
    <header className="app-header">
      <button className="icon-button" onClick={openMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <button className="brand" onClick={openMenu} aria-label="Open menu">
        <img src={cookingGeniusLogo} alt="Cooking Genius" />
      </button>
      <span className="header-spacer" />
    </header>
  );
}

function SecondaryHeader({ title, back }: { title: string; back: () => void }) {
  return (
    <header className="secondary-header">
      <button className="icon-button" onClick={back} aria-label="Back"><Icon name="arrow" /></button>
      <p>{title}</p>
      <span className="header-spacer" />
    </header>
  );
}

function BottomButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="primary-button" onClick={onClick} disabled={disabled}>{children}<span><Icon name="arrow" size={18} /></span></button>;
}

function InputToggle({ active, go }: { active: "camera" | "text"; go: (screen: Screen) => void }) {
  return (
    <div className="input-toggle">
      <button className={active === "camera" ? "active" : ""} onClick={() => go("camera")}><Icon name="camera" size={19} /> Camera</button>
      <button className={active === "text" ? "active" : ""} onClick={() => go("text")}><Icon name="text" size={19} /> Text</button>
    </div>
  );
}

function Drawer({ close, go }: { close: () => void; go: (screen: Screen) => void }) {
  const items: { label: string; screen: Screen; icon: IconName }[] = [
    { label: "Home", screen: "home", icon: "home" },
    { label: "Scan ingredients", screen: "camera", icon: "camera" },
    { label: "Type ingredients", screen: "text", icon: "text" },
    { label: "Cooking calendar", screen: "calendar", icon: "calendar" },
    { label: "Settings", screen: "settings", icon: "settings" },
  ];
  return (
    <div className="drawer-layer" onClick={close}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <img className="drawer-logo" src={cookingGeniusLogo} alt="Cooking Genius" />
          <button className="icon-button" onClick={close} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav>
          {items.map((item) => (
            <button key={item.label} onClick={() => { go(item.screen); close(); }}>
              <Icon name={item.icon} size={20} /><span>{item.label}</span><Icon name="chevron" size={16} />
            </button>
          ))}
        </nav>
        <button className="close-app">Close app</button>
      </aside>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [slide, setSlide] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [completedRecipeSteps, setCompletedRecipeSteps] = useState<boolean[]>([]);
  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  const [recipeDetail, setRecipeDetail] = useState<number | null>(null);
  const [foodScan, setFoodScan] = useState<FoodScan | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  const captureInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (foodScan) URL.revokeObjectURL(foodScan.imageUrl);
    };
  }, [foodScan]);

  useEffect(() => {
    if (screen !== "home") return;
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % photos.length), 4500);
    return () => window.clearInterval(timer);
  }, [screen]);

  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const analyzePhoto = async (file?: File) => {
    setScanError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setScanError("Choose an image file to scan.");
      return;
    }
    if (file.size > maxImageSize) {
      setScanError("That photo is too large. Choose an image under 10 MB.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${florenceApiUrl}/analyze`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "The photo could not be analyzed.");
      }
      setFoodScan({
        imageUrl,
        imageSize: result.image_size,
        detections: result.detections,
      });
      setSelectedRecipe(null);
      setRecipeDetail(null);
      go("recipes");
    } catch (error) {
      URL.revokeObjectURL(imageUrl);
      setScanError(
        error instanceof Error
          ? error instanceof TypeError || error.message.includes("Failed to fetch")
            ? "Could not reach the Florence scanner. Start the Florence API and try again."
            : error.message
          : "The photo could not be analyzed. Please try again.",
      );
    } finally {
      setScanning(false);
    }
  };

  const displayedRecipes = foodScan
    ? generateRecipes(foodScan.detections)
    : recipes;
  const detailRecipe = recipeDetail === null ? null : displayedRecipes[recipeDetail];
  const activeRecipe = selectedRecipe === null ? null : displayedRecipes[selectedRecipe];
  const recipeSteps = activeRecipe?.steps ?? recipes[0].steps;
  const estimatedTimeDifference = fastFoodPickupEstimate - getRecipeTimeMinutes(activeRecipe);
  const detectedFoods = foodScan
    ? [...new Set(foodScan.detections.map(({ label }) => label.trim()).filter(Boolean))]
    : [];
  const finishCooking = (completedSteps: number) => {
    setCookResult({
      score: Math.round(50 + 50 * completedSteps / recipeSteps.length),
      completed_steps: completedSteps,
      total_steps: recipeSteps.length,
    });
    go("summary");
  };

  const globalHeader = <AppHeader openMenu={() => setDrawer(true)} />;

  const Home = () => (
    <main className="screen home-screen">
      {globalHeader}
      <section className="hero">
        <div className="hero-images" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {photos.map((photo) => <img key={photo.url} src={photo.url} alt={photo.alt} />)}
        </div>
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow">COOK SMARTER</span>
          <h1>{photos[slide].label}</h1>
        </div>
        <div className="carousel-dots">{photos.map((_, index) => <button key={index} className={slide === index ? "active" : ""} onClick={() => setSlide(index)} aria-label={`Show slide ${index + 1}`} />)}</div>
      </section>
      <section className="home-intro">
        <h2>Turn what’s in your kitchen into something worth sharing.</h2>
        <p>Scan your ingredients, pick a recipe, and let Cooking Genius split the work.</p>
      </section>
      <div className="sticky-action"><BottomButton onClick={() => go("camera")}>Start a recipe</BottomButton></div>
    </main>
  );

  const Camera = () => (
    <main className="camera-screen">
      <div className="camera-bg" />
      <div className="camera-overlay">
        <header><button onClick={() => go("home")} className="camera-close" aria-label="Close"><Icon name="close" /></button><p>Scan ingredients</p><button className="flash">AUTO</button></header>
        <div className="scan-copy"><span>{scanning ? "ANALYZING WITH FLORENCE" : "POINT AT YOUR INGREDIENTS"}</span><p>{scanning ? "This can take a moment on the first scan" : "Take a photo or choose one from your device"}</p></div>
        <div className="target-frame"><i /><i /><i /><i /></div>
        <div className="camera-bottom">
          <input ref={captureInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { void analyzePhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <input ref={uploadInput} className="visually-hidden" type="file" accept="image/*" onChange={(event) => { void analyzePhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <button className="capture" onClick={() => captureInput.current?.click()} aria-label="Capture ingredients" disabled={scanning}><span><Icon name="spark" size={22} /></span></button>
          <button className="upload-photo" onClick={() => uploadInput.current?.click()} disabled={scanning}>Upload a photo</button>
          <InputToggle active="camera" go={go} />
          {scanError && <p className="scan-error" role="alert">{scanError}</p>}
        </div>
      </div>
    </main>
  );

  const TextInput = () => (
    <main className="screen input-screen">
      <SecondaryHeader title="Your ingredients" back={() => go("home")} />
      <section className="input-content">
        <span className="section-number">01 / INPUT</span>
        <h1>What are we working with?</h1>
        <p>List anything in your fridge or pantry. Don’t worry about quantities.</p>
        <div className="ingredient-box">
          <textarea defaultValue={"chickpeas\n2 bell peppers\nhalf a red onion\ntortillas\nlime"} aria-label="Ingredient list" />
          <div><span>5 ingredients</span><button aria-label="Clear ingredients"><Icon name="close" size={17} /></button></div>
        </div>
        <div className="suggestion-row"><span>Try adding:</span><button>eggs</button><button>rice</button><button>spinach</button></div>
      </section>
      <div className="input-actions"><BottomButton onClick={() => go("recipes")}>Find my recipes</BottomButton><InputToggle active="text" go={go} /></div>
    </main>
  );

  const Recipes = () => (
    <main className="screen recipes-screen">
      {globalHeader}
      <section className="page-heading">
        <span className="section-number">02 / CHOOSE</span>
        <div><h1>{foodScan ? "Recipes from your scan" : "Made for your pantry"}</h1><p>{foodScan ? `${displayedRecipes.length} ideas from ${detectedFoods.length} ${detectedFoods.length === 1 ? "food" : "foods"}` : "12 recipes found"}</p></div>
      </section>
      {foodScan && <section className="scan-results" aria-label="Florence scan results">
        <div className="scan-results-heading"><span>FLORENCE SCAN</span><button onClick={() => go("camera")}>Scan another photo</button></div>
        <div className="scan-preview" style={{ aspectRatio: `${foodScan.imageSize.width} / ${foodScan.imageSize.height}` }}>
          <img src={foodScan.imageUrl} alt="Your scanned ingredients" />
          {foodScan.detections.map((detection, index) => {
            const [x1, y1, x2, y2] = detection.bbox;
            return <span key={`${detection.label}-${index}`} className="detection-box" style={{ left: `${(x1 / foodScan.imageSize.width) * 100}%`, top: `${(y1 / foodScan.imageSize.height) * 100}%`, width: `${((x2 - x1) / foodScan.imageSize.width) * 100}%`, height: `${((y2 - y1) / foodScan.imageSize.height) * 100}%` }}><i>{detection.label}</i></span>;
          })}
        </div>
        {detectedFoods.length ? <div className="detection-labels">{detectedFoods.map((food) => <span key={food}>{food}</span>)}</div> : <p className="no-detections">No ingredients were recognized in this photo. Try a closer, well-lit picture.</p>}
      </section>}
      {foodScan && displayedRecipes.length > 0 && <p className="generated-recipes-note">Recipe ideas using foods Florence found, with basic pantry staples.</p>}
      <div className="recipe-scroll">
        {displayedRecipes.map((recipe, index) => (
          <button key={recipe.name} className={`recipe-card ${selectedRecipe === index ? "selected" : ""}`} onClick={() => { setSelectedRecipe(index); setTaskIndex(0); setCompletedRecipeSteps([]); }} onDoubleClick={() => setRecipeDetail(index)}>
            <div className="recipe-image"><img src={recipe.image} alt={recipe.name} /><span>{recipe.tag}</span>{selectedRecipe === index && <i><Icon name="check" size={17} /></i>}</div>
            <div className="recipe-info"><span>{recipe.match}</span><h2>{recipe.name}</h2><div><p><Icon name="clock" size={17} /> {recipe.time}</p><p><Icon name="chef" size={17} /> Easy</p></div><p className="recipe-description">{recipe.description}</p><small>Tap to select · double tap for details</small></div>
          </button>
        ))}
      </div>
      {foodScan && displayedRecipes.length === 0 && <p className="no-recipe-ideas">No food items were recognized, so there aren’t recipe ideas to show yet. Try another photo with the ingredients closer and well lit.</p>}
      <div className="sticky-action"><BottomButton disabled={selectedRecipe === null} onClick={() => go("instructions")}>{selectedRecipe === null ? "Select a recipe" : "Start cooking"}</BottomButton></div>
      {detailRecipe && <div className="modal-layer" onClick={() => setRecipeDetail(null)}><div className="detail-modal" onClick={(e) => e.stopPropagation()}><img src={detailRecipe.image} alt="" /><button onClick={() => setRecipeDetail(null)}><Icon name="close" /></button><div><span>{detailRecipe.match} · {detailRecipe.time}</span><h2>{detailRecipe.name}</h2><p>{detailRecipe.description}</p><h3>Ingredients</h3><p>{detailRecipe.ingredients.join(" · ")}</p><h3>Recipe steps</h3><ol>{detailRecipe.steps.map((step, index) => <li key={`${index}-${step.title}`}>{step.title}: {step.instruction}</li>)}</ol></div></div></div>}
    </main>
  );

  const Instructions = () => (
    <main className="screen instructions-screen">
      <SecondaryHeader title="Task preview" back={() => go("recipes")} />
      <section className="instruction-top"><span className="section-number">READY, SET, MISE</span><h1>{activeRecipe?.name ?? "Here’s your game plan."}</h1><p>{activeRecipe ? `${activeRecipe.time} · A suggested plan based on your selected recipe.` : "Three simple jobs. Dinner in 25."}</p></section>
      <section className="task-preview-list">
        {recipeSteps.map((step, index) => <article key={`${index}-${step.title}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{step.title}</h2><p>{step.instruction}</p><small><Icon name="clock" size={15} /> {step.duration}</small></div></article>)}
      </section>
      <div className="sticky-action"><BottomButton onClick={() => { setTaskIndex(0); setCompletedRecipeSteps(recipeSteps.map(() => false)); setCookResult(null); go("tasks"); }}>Start my tasks</BottomButton></div>
    </main>
  );

  const Tasks = () => {
    const currentStep = recipeSteps[taskIndex];
    const completedCount = completedRecipeSteps.filter(Boolean).length;
    const progress = (completedCount / recipeSteps.length) * 100;
    const isLastStep = taskIndex === recipeSteps.length - 1;
    const advanceStep = (completed: boolean) => {
      const nextCompletion = [...completedRecipeSteps];
      nextCompletion[taskIndex] = completed;
      setCompletedRecipeSteps(nextCompletion);
      if (isLastStep) {
        void finishCooking(nextCompletion.filter(Boolean).length);
      } else {
        setTaskIndex((index) => index + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    return (
      <main className="screen tasks-screen">
        <header className="task-header"><button onClick={() => taskIndex > 0 ? setTaskIndex((index) => index - 1) : go("instructions")} aria-label={taskIndex > 0 ? "Previous step" : "Back to task preview"}><Icon name="arrow" /></button><div><span>{activeRecipe?.name ?? "CRISPY GARDEN TACOS"}</span><p>Step {taskIndex + 1} of {recipeSteps.length}</p></div><b>{completedCount}/{recipeSteps.length}</b></header>
        <div className="progress-track" role="progressbar" aria-label="Recipe progress" aria-valuemin={0} aria-valuemax={recipeSteps.length} aria-valuenow={completedCount}><span style={{ width: `${progress}%` }} /></div>
        <section className="active-task">
          <div className="task-label"><span>{String(taskIndex + 1).padStart(2, "0")}</span><div><small>RECIPE STEP</small><strong>{currentStep.title}</strong></div><p>{currentStep.duration.toUpperCase()}</p></div>
          <article className="task-step-card"><span>STEP {taskIndex + 1}</span><p>{currentStep.instruction}</p></article>
        </section>
        <div className="sticky-action">
          <BottomButton onClick={() => advanceStep(true)}>{isLastStep ? "Finish recipe" : "Complete step"}</BottomButton>
          <button className="skip-step-button" onClick={() => advanceStep(false)}>Skip this step</button>
        </div>
      </main>
    );
  };

  const Summary = () => (
    <main className="screen summary-screen">
      <div className="summary-confetti"><i /><i /><i /><i /><i /></div>
      <span className="section-number">SERVICE COMPLETE</span>
      <h1>You cooked that.</h1>
      <p>{activeRecipe ? `${activeRecipe.name} · ${activeRecipe.time}` : "Crispy Garden Tacos · 24 minutes"}</p>
      <div className="score-ring" style={{ background: `conic-gradient(#f79a1f 0 ${cookResult?.score ?? 0}%, #ffffff20 ${cookResult?.score ?? 0}% 100%)` }}><div><span>COOK SCORE</span><strong>{cookResult?.score ?? 0}</strong><small>/ 100</small></div></div>
      <div className="glaze"><Icon name="spark" /><p><strong>{cookResult?.score === 100 ? "Perfect finish!" : "Nice work, chef."}</strong>{cookResult ? `You completed ${cookResult.completed_steps} of ${cookResult.total_steps} recipe steps.` : "You finished your recipe."}</p></div>
      <section className="wellness-card" aria-label="Homemade meal benefits">
        <div className="wellness-heading"><Icon name="clock" /><div><span>HOMEMADE ADVANTAGE</span><h2>Why this can beat fast food</h2></div></div>
        <div className="time-saved">
          <strong>{Math.abs(estimatedTimeDifference)} min</strong>
          <span>{estimatedTimeDifference > 0 ? "estimated faster than" : estimatedTimeDifference < 0 ? "estimated longer than" : "about the same time as"} a {fastFoodPickupEstimate}-minute fast-food pickup</span>
        </div>
        <h3>Benefits in your meal</h3>
        <ul>{getMealBenefits(activeRecipe).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
        <p className="wellness-note">Time is an estimate. Nutrition varies by recipe, portions, and restaurant; these are ingredient-based benefits, not medical advice.</p>
      </section>
      <div className="summary-actions">
        <BottomButton onClick={() => { setTaskIndex(0); setCompletedRecipeSteps([]); setSelectedRecipe(null); setCookResult(null); go("home"); }}>Back to home</BottomButton>
      </div>
    </main>
  );

  const Calendar = () => (
    <main className="screen pale-screen">
      {globalHeader}
      <section className="calendar-content"><span className="section-number">YOUR HISTORY</span><div className="calendar-title"><h1>March 2026</h1><div><button><Icon name="arrow" /></button><button><Icon name="chevron" /></button></div></div>
        <div className="calendar-grid">{["M","T","W","T","F","S","S"].map((day, i) => <strong key={i}>{day}</strong>)}{Array.from({length: 35}, (_, index) => { const day = index - 5; const cooked = [3,8,14,19].includes(day); return <button className={`${day < 1 || day > 29 ? "muted" : ""} ${day === 17 ? "today" : ""} ${cooked ? "cooked" : ""}`} key={index}>{day > 0 && day <= 29 ? day : ""}{cooked && <span><Icon name="chef" size={13} /></span>}</button>; })}</div>
        <div className="month-card"><div><span>MARCH SO FAR</span><strong>4 meals</strong></div><div><span>TIME COOKING</span><strong>2h 16m</strong></div></div>
      </section>
    </main>
  );

  const SimpleSettings = () => (
    <main className="screen pale-screen"><SecondaryHeader title="Settings" back={() => go("home")} /><section className="settings-content"><span className="section-number">PREFERENCES</span><h1>Kitchen settings</h1>
      <div className="settings-group"><p>NOTIFICATIONS</p>{["Task reminders", "Weekly cooking recap"].map((item, index) => <label className="setting-row" key={item}><span>{item}</span><input type="checkbox" defaultChecked={index === 0} /></label>)}</div><div className="settings-group"><p>ABOUT</p>{["Terms of service", "Privacy policy", "Help center"].map((item) => <button className="setting-row" key={item}><span>{item}</span><Icon name="chevron" size={17} /></button>)}</div>
    </section></main>
  );

  const views: Record<Screen, React.ReactNode> = {
    home: <Home />, camera: <Camera />, text: <TextInput />, recipes: <Recipes />, instructions: <Instructions />, tasks: <Tasks />, summary: <Summary />, calendar: <Calendar />, settings: <SimpleSettings />,
  };

  return <div className="app-shell">{views[screen]}{drawer && <Drawer close={() => setDrawer(false)} go={go} />}</div>;
}
