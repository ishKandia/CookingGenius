import { useEffect, useRef, useState } from "react";

type Screen =
  | "home"
  | "camera"
  | "text"
  | "recipes"
  | "chefs"
  | "instructions"
  | "tasks"
  | "summary"
  | "social"
  | "calendar"
  | "account"
  | "settings";

type IconName =
  | "menu"
  | "users"
  | "arrow"
  | "camera"
  | "text"
  | "clock"
  | "spark"
  | "plus"
  | "filter"
  | "lock"
  | "check"
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
  },
];

type FoodDetection = { label: string; bbox: [number, number, number, number] };
type FoodScan = {
  imageUrl: string;
  imageSize: { width: number; height: number };
  detections: FoodDetection[];
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
    },
  ];
}

const florenceApiUrl = import.meta.env.VITE_FLORENCE_API_URL ?? "http://localhost:8000";
const maxImageSize = 10 * 1024 * 1024;

const Icon = ({ name, size = 22 }: { name: IconName; size?: number }) => {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <><path d="M4 7h16M4 12h12M4 17h16" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    arrow: <><path d="m15 18-6-6 6-6" /></>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" /><circle cx="12" cy="13" r="3.5" /></>,
    text: <><path d="M5 6h14M5 10h14M5 14h9M5 18h12" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
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

function AppHeader({ openMenu, goSocial }: { openMenu: () => void; goSocial: () => void }) {
  return (
    <header className="app-header">
      <button className="avatar-button" onClick={openMenu} aria-label="Open menu">
        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="" />
      </button>
      <button className="brand" onClick={openMenu} aria-label="Open menu">
        <span>mise</span><i>.</i>
      </button>
      <button className="icon-button" onClick={goSocial} aria-label="Friends">
        <Icon name="users" />
        <span className="notification-dot" />
      </button>
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
    { label: "Account information", screen: "account", icon: "user" },
    { label: "Scan ingredients", screen: "camera", icon: "camera" },
    { label: "Type ingredients", screen: "text", icon: "text" },
    { label: "Social", screen: "social", icon: "users" },
    { label: "Cooking calendar", screen: "calendar", icon: "calendar" },
    { label: "Settings", screen: "settings", icon: "settings" },
  ];
  return (
    <div className="drawer-layer" onClick={close}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <div className="mini-brand">mise<i>.</i></div>
          <button className="icon-button" onClick={close} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <div className="profile-card">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" alt="Maya's profile" />
          <div><strong>Maya Chen</strong><span>Kitchen rookie · 1,240 pts</span></div>
        </div>
        <nav>
          {items.map((item) => (
            <button key={item.label} onClick={() => { go(item.screen); close(); }}>
              <Icon name={item.icon} size={20} /><span>{item.label}</span><Icon name="chevron" size={16} />
            </button>
          ))}
        </nav>
        <div className="drawer-streak"><Icon name="spark" /><div><strong>3 week streak</strong><span>Cook once this week to keep it going.</span></div></div>
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [chefCount, setChefCount] = useState(1);
  const [checks, setChecks] = useState([false, false, false, false]);
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
  const detectedFoods = foodScan
    ? [...new Set(foodScan.detections.map(({ label }) => label.trim()).filter(Boolean))]
    : [];

  const globalHeader = <AppHeader openMenu={() => setDrawer(true)} goSocial={() => go("social")} />;

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
        <div className="intro-title"><p>Tonight’s plan</p><span>Tuesday, 6:14 PM</span></div>
        <h2>Turn what’s in your kitchen into something worth sharing.</h2>
        <p>Scan your ingredients, pick a recipe, and let Mise split the work.</p>
        <div className="quick-stats">
          <div><Icon name="clock" /><strong>25 min</strong><span>average cook</span></div>
          <div><Icon name="spark" /><strong>1,240</strong><span>total points</span></div>
          <div><Icon name="chef" /><strong>12</strong><span>meals made</span></div>
        </div>
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
          <button key={recipe.name} className={`recipe-card ${selectedRecipe === index ? "selected" : ""}`} onClick={() => setSelectedRecipe(index)} onDoubleClick={() => setRecipeDetail(index)}>
            <div className="recipe-image"><img src={recipe.image} alt={recipe.name} /><span>{recipe.tag}</span>{selectedRecipe === index && <i><Icon name="check" size={17} /></i>}</div>
            <div className="recipe-info"><span>{recipe.match}</span><h2>{recipe.name}</h2><div><p><Icon name="clock" size={17} /> {recipe.time}</p><p><Icon name="chef" size={17} /> Easy</p></div><p className="recipe-description">{recipe.description}</p><small>Tap to select · double tap for details</small></div>
          </button>
        ))}
      </div>
      {foodScan && displayedRecipes.length === 0 && <p className="no-recipe-ideas">No food items were recognized, so there aren’t recipe ideas to show yet. Try another photo with the ingredients closer and well lit.</p>}
      <button className="filter-button" onClick={() => setFilterOpen(true)}><Icon name="filter" size={19} /> Filter recipes <span>2</span></button>
      <section className="party-panel">
        <div className="party-title"><div><span>YOUR KITCHEN</span><h3>Chef count</h3></div><div className="chef-faces"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" alt="Maya" />{chefCount > 1 && <div>JL</div>}<strong>{chefCount}</strong></div></div>
        <button className="outline-button" onClick={() => go("chefs")}><Icon name="plus" size={18} /> Add chefs</button>
        <label className="extra-prompt"><Icon name="spark" size={19} /><input placeholder="Make it spicy, use one pan..." /><button aria-label="Apply prompt"><Icon name="arrow" size={18} /></button></label>
      </section>
      <div className="sticky-action"><BottomButton disabled={selectedRecipe === null} onClick={() => go("instructions")}>{selectedRecipe === null ? "Select a recipe" : "Start cooking"}</BottomButton></div>
      {filterOpen && <div className="modal-layer" onClick={() => setFilterOpen(false)}><div className="bottom-sheet" onClick={(e) => e.stopPropagation()}><i className="sheet-handle" /><div className="sheet-heading"><div><span>PERSONALIZE</span><h2>Filter recipes</h2></div><button onClick={() => setFilterOpen(false)}><Icon name="close" /></button></div><div className="filter-group"><p>DIETARY</p><label><span>Vegetarian</span><input type="checkbox" defaultChecked /></label><label><span>Dairy-free</span><input type="checkbox" /></label></div><div className="filter-group"><p>COOK TIME</p><div className="chip-row"><button>Under 15 min</button><button className="selected">Under 30 min</button><button>Any time</button></div></div><BottomButton onClick={() => setFilterOpen(false)}>Show 8 recipes</BottomButton></div></div>}
      {detailRecipe && <div className="modal-layer" onClick={() => setRecipeDetail(null)}><div className="detail-modal" onClick={(e) => e.stopPropagation()}><img src={detailRecipe.image} alt="" /><button onClick={() => setRecipeDetail(null)}><Icon name="close" /></button><div><span>{detailRecipe.match} · {detailRecipe.time}</span><h2>{detailRecipe.name}</h2><p>{detailRecipe.description}</p><h3>Ingredients</h3><p>{detailRecipe.ingredients.join(" · ")}</p><h3>How to make it</h3><p>{detailRecipe.method}</p></div></div></div>}
    </main>
  );

  const Chefs = () => (
    <main className="screen pale-screen">
      <SecondaryHeader title="Your kitchen" back={() => go("recipes")} />
      <section className="chefs-content">
        <span className="section-number">03 / TEAM</span><h1>Who’s cooking?</h1><p>Invite up to 3 friends. We’ll give everyone a job.</p>
        <div className="roster">
          <div className="roster-item"><span className="position">01</span><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Maya" /><div><strong>You</strong><small>Host · Ready</small></div><span className="host-pill">HOST</span></div>
          {chefCount > 1 && <div className="roster-item"><span className="position">02</span><div className="initial-avatar">JL</div><div><strong>Jordan Lee</strong><small>Ready to cook</small></div><button onClick={() => setChefCount(1)}><Icon name="close" size={17} /></button></div>}
        </div>
        {chefCount < 4 && <button className="add-chef-card" onClick={() => setFriendOpen(true)}><span><Icon name="plus" /></span><div><strong>Add a chef</strong><small>{4 - chefCount} spots left in your kitchen</small></div><Icon name="chevron" size={18} /></button>}
      </section>
      <div className="sticky-action"><BottomButton onClick={() => go("recipes")}>Kitchen ready</BottomButton></div>
      {friendOpen && <div className="modal-layer" onClick={() => setFriendOpen(false)}><div className="bottom-sheet" onClick={(e) => e.stopPropagation()}><i className="sheet-handle" /><div className="sheet-heading"><div><span>INVITE</span><h2>Add a chef</h2></div><button onClick={() => setFriendOpen(false)}><Icon name="close" /></button></div><button className="friend-row" onClick={() => { setChefCount(2); setFriendOpen(false); }}><div className="initial-avatar">JL</div><div><strong>Jordan Lee</strong><span>Online now</span></div><Icon name="plus" /></button><button className="friend-row"><div className="initial-avatar orange">AN</div><div><strong>Alex Nguyen</strong><span>Cooked with you 3×</span></div><Icon name="plus" /></button><button className="copy-link"><Icon name="copy" /> Copy invite link</button></div></div>}
    </main>
  );

  const Instructions = () => (
    <main className="screen instructions-screen">
      <SecondaryHeader title="Task preview" back={() => go("recipes")} />
      <section className="instruction-top"><span className="section-number">READY, SET, MISE</span><h1>{activeRecipe?.name ?? "Here’s your game plan."}</h1><p>{activeRecipe ? `${activeRecipe.time} · A suggested plan based on your selected recipe.` : chefCount > 1 ? "Two chefs. Three jobs. Dinner in 25." : "Three simple jobs. Dinner in 25."}</p></section>
      <div className="task-owner"><div><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" alt="" /><span><small>YOUR TASKS</small><strong>Maya</strong></span></div><span>1 of {chefCount}</span></div>
      <section className="task-preview-list">
        {(activeRecipe
          ? [["01", "Prep your ingredients", "8 min", `Prepare: ${activeRecipe.ingredients.slice(0, 3).join(", ")}.`], ["02", "Cook the recipe", activeRecipe.time, activeRecipe.method], ["03", "Taste & serve", "5 min", "Adjust the seasoning, plate your food, and enjoy."]]
          : [["01", "Prep the vegetables", "8 min", "Slice peppers and onion into even strips."], ["02", "Build the lime crema", "4 min", "Mix, season, taste, and adjust."], ["03", "Warm & assemble", "10 min", "Bring every part together."]]
        ).map((task, index) => <article key={task[0]}><span>{task[0]}</span><div><h2>{task[1]}</h2><p>{task[3]}</p><small><Icon name="clock" size={15} /> {task[2]}{index === 0 && <b><Icon name="camera" size={14} /> Photo check</b>}</small></div></article>)}
      </section>
      {chefCount > 1 && <div className="swipe-hint"><Icon name="arrow" size={16} /> Swipe to preview Jordan’s tasks <Icon name="chevron" size={16} /></div>}
      <div className="sticky-action"><BottomButton onClick={() => go("tasks")}>Start my tasks</BottomButton></div>
    </main>
  );

  const Tasks = () => {
    const taskRows = activeRecipe
      ? [
          ["Gather and prep your ingredients", `Get ready: ${activeRecipe.ingredients.slice(0, 3).join(", ")}.`],
          ["Cook your selected recipe", activeRecipe.method],
          ["Taste and adjust", "Check the seasoning and make any final adjustments."],
          ["Show us your finished dish", "Take a photo to complete your meal."],
        ]
      : [
          ["Wash and dry all produce", "No soggy vegetables here."],
          ["Slice peppers into thin strips", "Aim for pieces about the same size."],
          ["Dice half the red onion", "Small, even pieces cook fastest."],
          ["Show us your prep", "Take a photo to unlock cooking."],
        ];
    const toggle = (index: number) => {
      if (index > 0 && !checks[index - 1]) return;
      const next = [...checks]; next[index] = !next[index]; setChecks(next);
    };
    const complete = checks.every(Boolean);
    return (
      <main className="screen tasks-screen">
        <header className="task-header"><button onClick={() => go("instructions")}><Icon name="arrow" /></button><div><span>{activeRecipe?.name ?? "CRISPY GARDEN TACOS"}</span><p>Task 1 of 3</p></div><b>{checks.filter(Boolean).length}/4</b></header>
        <div className="progress-track"><span style={{ width: `${checks.filter(Boolean).length * 25}%` }} /></div>
        <section className="active-task">
          <div className="task-label"><span>01</span><div><small>ACTIVE TASK</small><strong>{activeRecipe ? "Prep your ingredients" : "Prep the vegetables"}</strong></div><p>8 MIN</p></div>
          <div className="tip"><Icon name="spark" /><p><strong>Mise tip</strong>{activeRecipe ? activeRecipe.method : "Even pieces cook at the same speed. Slow down now, save time later."}</p></div>
          <div className="checklist">
            {taskRows.map((row, index) => {
              const locked = index > 0 && !checks[index - 1];
              return <button key={row[0]} className={`${checks[index] ? "done" : ""} ${locked ? "locked" : ""}`} onClick={() => toggle(index)}><span className="check-circle">{locked ? <Icon name="lock" size={15} /> : checks[index] ? <Icon name="check" size={17} /> : index + 1}</span><div><strong>{row[0]}</strong><small>{row[1]}</small></div>{index === 3 && !locked && <Icon name="camera" />}</button>;
            })}
          </div>
        </section>
        <div className="sticky-action"><BottomButton disabled={!complete} onClick={() => go("summary")}>{complete ? "Plate & finish" : "Complete each step"}</BottomButton></div>
      </main>
    );
  };

  const Summary = () => (
    <main className="screen summary-screen">
      <div className="summary-confetti"><i /><i /><i /><i /><i /></div>
      <span className="section-number">SERVICE COMPLETE</span>
      <h1>You cooked that.</h1>
      <p>{activeRecipe ? `${activeRecipe.name} · ${activeRecipe.time}` : "Crispy Garden Tacos · 24 minutes"}</p>
      <div className="score-ring"><div><span>MEAL SCORE</span><strong>92</strong><small>/ 100</small></div></div>
      <div className="glaze"><Icon name="spark" /><p><strong>{activeRecipe ? "Nice work, chef." : "“Restaurant energy.”"}</strong>{activeRecipe ? `You made ${activeRecipe.name} from your kitchen scan.` : "Excellent color, clean cuts, and the crisp on those chickpeas is doing serious work."}</p></div>
      <section className="score-breakdown"><div><span>Technique</span><strong>+40</strong></div><div><span>Presentation</span><strong>+32</strong></div><div><span>Zero-waste bonus</span><strong>+20</strong></div></section>
      <div className="badge-unlock"><div><Icon name="chef" size={28} /></div><span><small>NEW BADGE</small><strong>Weeknight Wizard</strong><p>Cook 3 meals under 30 minutes</p></span></div>
      <BottomButton onClick={() => { setChecks([false, false, false, false]); setSelectedRecipe(null); go("home"); }}>Back to home</BottomButton>
    </main>
  );

  const Social = () => (
    <main className="screen pale-screen">
      <SecondaryHeader title="Your people" back={() => go("home")} />
      <section className="social-content"><span className="section-number">COOKING CREW</span><div className="social-heading"><h1>Friends</h1><button><Icon name="plus" /> Add friend</button></div>
        {[["JL", "Jordan Lee", "1,520 pts", "5 day streak"], ["AN", "Alex Nguyen", "1,310 pts", "Cooked yesterday"], ["SK", "Sam Kim", "980 pts", "2 day streak"]].map((friend, index) => <div className="friend-item" key={friend[1]}><span className={`initial-avatar color-${index}`}>{friend[0]}</span><div><strong>{friend[1]}</strong><small>{friend[3]}</small></div><b>{friend[2]}</b></div>)}
        <div className="leaderboard-head"><div><span>GLOBAL</span><h2>Leaderboard</h2></div><select aria-label="Leaderboard timeframe"><option>This week</option><option>All time</option><option>This month</option></select></div>
        <div className="podium"><div><span>2</span><div className="initial-avatar">JL</div><strong>Jordan</strong><small>380</small></div><div className="winner"><Icon name="spark" /><div className="initial-avatar">MC</div><strong>You</strong><small>420</small></div><div><span>3</span><div className="initial-avatar orange">AN</div><strong>Alex</strong><small>310</small></div></div>
      </section>
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

  const SimpleSettings = ({ account = false }: { account?: boolean }) => (
    <main className="screen pale-screen"><SecondaryHeader title={account ? "Account information" : "Settings"} back={() => go("home")} /><section className="settings-content"><span className="section-number">{account ? "YOUR PROFILE" : "PREFERENCES"}</span><h1>{account ? "Make it yours." : "Kitchen settings"}</h1>
      {account ? <><div className="edit-avatar"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" alt="Profile" /><button><Icon name="camera" /></button></div>{[["Display name","Maya Chen"],["Email address","maya.chen@example.com"],["Password","••••••••••"]].map((field) => <label className="form-field" key={field[0]}><span>{field[0]}</span><input defaultValue={field[1]} /></label>)}<BottomButton onClick={() => go("home")}>Save changes</BottomButton></> :
      <><div className="settings-group"><p>NOTIFICATIONS</p>{["Task reminders","Friend activity","Weekly cooking recap"].map((item, index) => <label className="setting-row" key={item}><span>{item}</span><input type="checkbox" defaultChecked={index < 2} /></label>)}</div><div className="settings-group"><p>ABOUT</p>{["Terms of service","Privacy policy","Help center"].map((item) => <button className="setting-row" key={item}><span>{item}</span><Icon name="chevron" size={17} /></button>)}</div><button className="delete-account">Delete account</button></>}
    </section></main>
  );

  const views: Record<Screen, React.ReactNode> = {
    home: <Home />, camera: <Camera />, text: <TextInput />, recipes: <Recipes />, chefs: <Chefs />, instructions: <Instructions />, tasks: <Tasks />, summary: <Summary />, social: <Social />, calendar: <Calendar />, account: <SimpleSettings account />, settings: <SimpleSettings />,
  };

  return <div className="app-shell">{views[screen]}{drawer && <Drawer close={() => setDrawer(false)} go={go} />}</div>;
}
