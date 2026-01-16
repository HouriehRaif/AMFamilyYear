/* global require */

let view;
let popupLang = "en"; // "en" | "ar"

// Tabs
let activeCategory = "All"; // "All" | "<category>"

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/PopupTemplate"
], function (Map, MapView, FeatureLayer, PopupTemplate) {

  const map = new Map({ basemap: "satellite" });

  view = new MapView({
    container: "viewDiv",
    map,
    center: [55.52737998962385, 25.402667492387888],
    zoom: 14,
    ui: { components: [] }
  });

  // Track layers we add (so we can render our unified control list)
  // item shape: { layer, iconUrl, category }
  const operationalLayers = [];

  function formatLayerName(name) { return (name || "").replace(/_/g, " "); }

  function getArabicLayerName(name) {
    const mapAr = {
      "Sport_Clubs": "الأندية الرياضية",
      "Hospitals": "المستشفيات",
      "Parks": "الحدائق",
      "Running_Cycling_Track": "مسارات الجري والدراجات",
      "Shopping_Centers": "مراكز التسوق",
      "Nurseries": "الحضانات",
      "Family_Psychological_Centers": "مراكز الإرشاد الأسري",
      "Neighborhood_Councils": "مجالس الأحياء",
      "Universities": "الجامعات"
    };
    return mapAr[name] || formatLayerName(name);
  }

  function buildPopupTemplate() {
    const isAr = popupLang === "ar";
    return new PopupTemplate({
      title: isAr
        ? "<div style='direction: rtl; text-align:right;'><strong>{NameAR}</strong></div>"
        : "<strong>{NameEN}</strong>",
      content: [{
        type: "text",
        text: isAr
          ? (
            "<div style='font-size:13px; line-height:1.8; direction:rtl; text-align:right;'>" +
              "<p><strong>الاسم العربي:</strong> {name_ar}</p>" +
              "<p><strong>النوع:</strong> {Cat_ar}</p>" +
            "</div>"
          )
          : (
            "<div style='font-size:13px; line-height:1.8; direction:ltr; text-align:left;'>" +
              "<p><strong>English Name:</strong> {name_en}</p>" +
              "<p><strong>Category:</strong> {Cat_en}</p>" +
            "</div>"
          )
      }]
    });
  }

  function applyLanguage() {
    const isAr = popupLang === "ar";

    operationalLayers.forEach(function (l) {
      l.layer.title = isAr ? l.layer._titleAR : l.layer._titleEN;
      l.layer.popupTemplate = buildPopupTemplate();
    });

    const badge = document.getElementById("langBadge");
    if (badge) badge.textContent = "Popup: " + (isAr ? "AR" : "EN");

    if (view && view.popup) view.closePopup();

    const body = document.getElementById("appBody");
    if (body) {
      if (isAr) {
        body.setAttribute("dir", "rtl");
        body.classList.add("rtl");
      } else {
        body.setAttribute("dir", "ltr");
        body.classList.remove("rtl");
      }
    }

    renderUnifiedControls();
  }

  function getCategoryOrderFromManifest() {
    // Preserve manifest ordering (sorted already in your manifest file)
    const seen = new Set();
    const ordered = [];
    for (const item of operationalLayers) {
      const c = item.category || "Other";
      if (!seen.has(c)) {
        seen.add(c);
        ordered.push(c);
      }
    }
    return ordered;
  }

  function setActiveCategory(cat) {
    activeCategory = cat;

    applyCategoryToMap();    
    renderUnifiedControls();   
}

function applyCategoryToMap() {
    operationalLayers.forEach(function (x) {
        if (activeCategory === "All") {
        x.layer.visible = true;
        } else {
        x.layer.visible = (x.category || "Other") === activeCategory;
        }
    });

    // Optional: close popup to avoid showing results from hidden layers
    if (view && view.popup) view.closePopup();
}

  function getCategoryLabel(cat) {
    const isAr = popupLang === "ar";
    const mapAr = {
      "All": "الكل",
      "Family Services": "خدمات الأسرة",
      "Quality of Life": "جودة الحياة",
      "Family Cohesion": "التماسك الأسري",
      "Other": "أخرى"
    };
    return isAr ? (mapAr[cat] || cat) : cat;
  }

  function buildTabs(host, categories) {
    // segmented tabs that fill width (and scroll if needed)
    const tabsWrap = document.createElement("div");
    tabsWrap.className = "flex w-full items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1";

const activeCls =
  "flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200";
const inactiveCls =
  "flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white/70";

    // All
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.textContent = getCategoryLabel("All");
    allBtn.className = (activeCategory === "All") ? activeCls : inactiveCls;
    allBtn.addEventListener("click", function () { setActiveCategory("All"); });
    tabsWrap.appendChild(allBtn);

    // Categories
    for (const cat of categories) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = getCategoryLabel(cat);
      btn.className = (activeCategory === cat) ? activeCls : inactiveCls;
      btn.addEventListener("click", function () { setActiveCategory(cat); });
      tabsWrap.appendChild(btn);
    }

    host.appendChild(tabsWrap);
  }

  // ---- Unified Controls UI (tabs + filtered layers list) ----
  function renderUnifiedControls() {
    const host = document.getElementById("panelControls");
    if (!host) return;

    host.innerHTML = "";

    const isAr = popupLang === "ar";

    // Tabs
    const categories = getCategoryOrderFromManifest();
    const tabsHost = document.getElementById("categoryTabs");
    if (tabsHost) {
      tabsHost.innerHTML = "";
      buildTabs(tabsHost, categories);
    }

    // List
    const list = document.createElement("div");
    list.className = "overflow-auto";
    host.appendChild(list);

    const filtered = operationalLayers.filter(function (x) {
      if (activeCategory === "All") return true;
      return (x.category || "Other") === activeCategory;
    });

    filtered.sort((a, b) => {
      const ta = (isAr ? a.layer._titleAR : a.layer._titleEN) || "";
      const tb = (isAr ? b.layer._titleAR : b.layer._titleEN) || "";
      return ta.localeCompare(tb);
    });

    for (const item of filtered) {
      const layer = item.layer;
      const title = isAr ? layer._titleAR : layer._titleEN;
      const iconUrl = item.iconUrl;

      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm mb-2";
      row.classList.add("layer-row");

      // Left: icon + title
      const left = document.createElement("div");
      left.className = "flex items-center gap-3 min-w-0";
      left.classList.add("layer-row-left");

      const iconWrap = document.createElement("div");
      iconWrap.className = "h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0";

      const img = document.createElement("img");
      img.src = iconUrl;
      img.alt = title;
      img.className = "h-10 w-10";
      img.onerror = function () { iconWrap.textContent = "•"; };

      iconWrap.appendChild(img);

      const titleEl = document.createElement("div");
      titleEl.className = "text-sm font-semibold text-slate-900 truncate";
      titleEl.classList.add("layer-row-title");
      titleEl.textContent = title;

      left.appendChild(iconWrap);
      left.appendChild(titleEl);

      // Right: toggle + zoom
      const right = document.createElement("div");
      right.className = "flex items-center gap-2 shrink-0";
      right.classList.add("layer-row-right");

      // Toggle
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      const knob = document.createElement("span");

      function syncToggleUI() {
        const isRtl = document.body.getAttribute("dir") === "rtl";

        toggleBtn.className =
          "relative inline-flex h-9 w-16 items-center rounded-full transition " +
          (layer.visible ? "bg-slate-900" : "bg-slate-200");
        toggleBtn.setAttribute("aria-pressed", layer.visible ? "true" : "false");

        knob.className =
          "inline-block h-7 w-7 transform rounded-full bg-white shadow transition " +
          (layer.visible
            ? (isRtl ? "translate-x-1" : "translate-x-8")
            : (isRtl ? "translate-x-8" : "translate-x-1"));
      }

      toggleBtn.appendChild(knob);
      syncToggleUI();

      toggleBtn.addEventListener("click", function () {
        layer.visible = !layer.visible;
        syncToggleUI();
      });

      // Zoom-to
      const zoomBtn = document.createElement("button");
      zoomBtn.type = "button";
      zoomBtn.className = "h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100";
      zoomBtn.title = isAr ? "تكبير إلى الطبقة" : "Zoom to layer";
      zoomBtn.textContent = "🔎";

      zoomBtn.addEventListener("click", async function () {
        try {
          const q = layer.createQuery();
          q.where = "1=1";
          q.returnGeometry = true;
          q.outSpatialReference = view.spatialReference;

          const res = await layer.queryExtent(q);
          if (res && res.extent) {
            view.goTo(res.extent.expand(1.5));
          }
        } catch (e) {
          console.log("Zoom failed:", e);
        }
      });

      // Swap control order in RTL
      const isRtl = document.body.getAttribute("dir") === "rtl";
      if (isRtl) {
        right.appendChild(zoomBtn);
        right.appendChild(toggleBtn);
      } else {
        right.appendChild(toggleBtn);
        right.appendChild(zoomBtn);
      }

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-sm text-slate-500 px-2 py-4";
      empty.textContent = isAr ? "لا توجد طبقات ضمن هذه الفئة." : "No layers in this category.";
      list.appendChild(empty);
    }
  }

  // ---- Language toggle button ----
  const popupLangBtn = document.getElementById("popupLangBtn");
  if (popupLangBtn) {
    popupLangBtn.addEventListener("click", function () {
      popupLang = (popupLang === "en") ? "ar" : "en";
      const txt = document.getElementById("popupLangBtnText");
      if (txt) txt.textContent = (popupLang === "en") ? "AR" : "EN";
      applyLanguage();
    });
  }

  async function loadGeoJSONLayers() {
    try {
      const manifestResponse = await fetch("./manifest.json");
      const manifest = await manifestResponse.json();

      for (const fileInfo of manifest.layers) {
        try {
          const geojsonResponse = await fetch(fileInfo.path);
          const geojson = await geojsonResponse.json();

          const titleEN = formatLayerName(fileInfo.name);
          const titleAR = getArabicLayerName(fileInfo.name);

          const graphics = geojson.features.map((feature, index) => ({
            geometry: { type: "point", x: feature.geometry.coordinates[0], y: feature.geometry.coordinates[1] },
            attributes: {
              OBJECTID: feature.id || index,
              NameEN: titleEN,
              NameAR: titleAR,
              ...feature.properties
            }
          }));

          const iconUrl = `./Features/Icons/${fileInfo.name}.svg?v=${Date.now()}`;

          const layer = new FeatureLayer({
            source: graphics,
            objectIdField: "OBJECTID",
            title: (popupLang === "ar") ? titleAR : titleEN,
            popupTemplate: buildPopupTemplate(),
            fields: [
              { name: "OBJECTID", type: "oid" },
              { name: "NameEN", type: "string" },
              { name: "NameAR", type: "string" },
              { name: "name_en", type: "string" },
              { name: "name_ar", type: "string" },
              { name: "Cat_en", type: "string" },
              { name: "Cat_ar", type: "string" },
              { name: "city", type: "string" }
            ],
            renderer: {
              type: "simple",
              symbol: {
                type: "picture-marker",
                url: iconUrl,
                width: "40px",
                height: "45px"
              }
            }
          });

          layer._titleEN = titleEN;
          layer._titleAR = titleAR;

          map.add(layer);

          operationalLayers.push({
            layer,
            iconUrl,
            category: fileInfo.category || "Other"
          });

        } catch (e) {
          console.log(`Error loading ${fileInfo.path}: ${e.message}`);
        }
      }

      activeCategory = "All";
      applyCategoryToMap();
      renderUnifiedControls();

    } catch (error) {
      console.error("Error loading GeoJSON layers:", error);
    }
  }

  view.when(function () {
    loadGeoJSONLayers();
  });
});

// ---- Bottom panel toggle button ----
const mapContainer = document.getElementById("mapContainer");
const panel = document.getElementById("panelContainer");
const toggleBtn = document.getElementById("panelToggleBtn");
const toggleText = document.getElementById("panelToggleText");

let panelVisible = true;             
if (toggleText) toggleText.textContent = "▼";   // arrow points down when panel is shown

if (toggleBtn && panel && mapContainer) {
  toggleBtn.addEventListener("click", function () {
    panelVisible = !panelVisible;

    if (panelVisible) {
      panel.style.display = "block";
      mapContainer.classList.remove("basis-full");
      mapContainer.classList.add("basis-3/4");
      toggleText.textContent = "▼"; // hide
    } else {
      panel.style.display = "none";
      mapContainer.classList.remove("basis-3/4");
      mapContainer.classList.add("basis-full");
      toggleText.textContent = "▲"; // show
    }
  });
}
