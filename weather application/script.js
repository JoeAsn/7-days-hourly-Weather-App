//  ---API key 
const apiKey = "5aeb3e1e392778fbd2db1f6e108b02b2";
const weatherIcons = {
    0: "01d", 1: "01d", 2: "02d", 3: "04d",
    45: "50d", 48: "50d", 51: "09d", 53: "09d", 55: "09d",
    61: "10d", 63: "10d", 65: "10d", 71: "13d", 73: "13d",
    75: "13d", 80: "09d", 81: "09d", 82: "09d",
    95: "11d", 96: "11d", 99: "11d"
};
const searchBtn = document.querySelector("#searchBtn");
const country = document.querySelector("#heroCity");
const temp = document.querySelector("#heroTemp");
const hIcon = document.querySelector(".h-icon")
const icon = document.querySelector("#heroIcon");
const hourly = document.querySelectorAll(".hourly-row");
let weatherContent = document.querySelector("#weatherContent")
const cards = document.querySelectorAll(".stat-card .stat-val");
const form = document.querySelector("form");
const sevenDaysForcast = document.querySelectorAll(".daily-card");
let htmlDate = document.querySelector("#heroDate")
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const unitsDropdown = document.querySelector(".units-dropdown");

// Unit converter function
function convertUnits(value, unitType, toImperial = false) {
    if (unitType === 'temp' && toImperial) {
        return Math.round((value * 9/5) + 32);
    } else if (unitType === 'wind' && toImperial) {
        return Math.round(value * 0.621371);
    } else if (unitType === 'precip' && toImperial) {
        return Math.round(value * 0.0393701 * 100) / 100;
    }
    return value;
}

const date = new Date();
let monthName = months[date.getUTCMonth()];
let year = date.getUTCFullYear();
let weekDay = weekDays[date.getUTCDay()];
let dayNumber = date.getUTCDate();
htmlDate.textContent = `${weekDay} ${monthName} ${dayNumber} ${year}`;

let hourlyForcast;
let filtered;
let isImperial = false;
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    console.log(position.coords)

    // Use OpenWeather directly with coordinates — no BigDataCloud needed
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    )
      .then(res => res.json())
      .then(data => {
        const cityName = data.name; 
        console.log(cityName)// ✅ OpenWeather returns the correct city name
        document.querySelector("#searchInput").value = cityName;
        getWeather(); // ✅ pass city directly, no race condition
      })
      .catch(err => console.log("Geolocation weather fetch failed:", err));
  },
  (error) => {
    console.log("Geolocation error: " + error.message);
  }
);
const loadingState = document.querySelector("#loadingState");
loadingState.style.display = "block";
weatherContent.style.display = "none";
loadingState.style.display = "block";
weatherContent.style.display = "none";

const getWeather = async () => {
    document.querySelector("#errorState").style.display = "none";
    const city = document.querySelector("#searchInput").value;
    weatherContent.style.display = "none";
    loadingState.style.display = "block";
    let searchProgress = document.querySelector("#searchProgress");
    searchProgress.style.display = "block";
    try {
        const fetchedData = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`, 
            {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        if (!fetchedData.ok) throw new Error("City not found");

        const jsonData = await fetchedData.json();
        const longitude = jsonData.coord.lon;
        const latitude = jsonData.coord.lat;

        const geoUrl = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const sevenDay = await geoUrl.json();
        hourlyForcast = sevenDay;

        sevenDay.daily.time.forEach((element, index) => {
            const forecastDate = new Date(element);
            const dayName = weekDays[forecastDate.getUTCDay()];
            const dayNum = forecastDate.getUTCDate();
            const code = sevenDay.daily.weather_code[index];
            const high = Math.round(sevenDay.daily.temperature_2m_max[index]);
            const low = Math.round(sevenDay.daily.temperature_2m_min[index]);
            const li = sevenDaysForcast[index];
            if (!li) return;
            li.children[0].textContent = `${dayName} ${dayNum}`;
            li.children[1].src = `https://openweathermap.org/img/wn/${weatherIcons[code]}@2x.png`;
            li.children[2].textContent = `H / ${high}° L / ${low}°`;
        });
        country.textContent = `${jsonData.sys?.country} , ${jsonData.name}`;
        temp.textContent = `${jsonData.main.temp} °C`;
        icon.src = `https://openweathermap.org/img/wn/${jsonData.weather[0].icon}@2x.png`;
        cards[0].textContent = `${jsonData.main.feels_like} °C`;
        cards[1].textContent = `${jsonData.main.humidity}%`;
        cards[2].innerHTML = `${jsonData.wind.speed} <span>mph NW</span>`;
        cards[3].textContent = `${jsonData?.rain?.["1h"] ?? 0}`;

        filtered = sevenDay.hourly.time.reduce((acc, time, i) => {
            const date = new Date(time);
            const hour = date.getHours();
            if (hour >= 15 && hour <= 22) {
                acc.push({
                    time: date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                    day: weekDays[date.getUTCDay()],
                    temperature: sevenDay.hourly.temperature_2m[i],
                    code: sevenDay.hourly.weather_code[i]
                });
            }
            return acc;
        }, []);

        applyHourly();
        document.querySelector(".autocomplete").style.display = "none";

        searchProgress.style.display = "none";
        loadingState.style.display = "none";
        weatherContent.style.display = "block";

    } catch (error) {
        if (error.message === "Failed to fetch") {
        console.log(error);
        searchProgress.style.display = "none";
        weatherContent.style.display = "none";
        loadingState.style.display = "none";
        document.querySelector("#errorState").style.display = "block";


    }
         else{
            console.log(error);
            searchProgress.style.display = "none";
            document.querySelector("#noResults").style.display = "block";
            weatherContent.style.display = "none";
            loadingState.style.display = "none";
    }

    }
}

// FIX 1 & 2: fixed variable shadowing + actually calling countries()
let countriesName = [];

async function loadCountries() {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name');
    const data = await res.json();
    countriesName = data.map(c => c.name.common).sort();
}

function autoComplete(e) {
    const val = e.target.value.toLowerCase();
    const autocompleteEl = document.querySelector(".autocomplete");
    if (!val) {
        autocompleteEl.style.display = "none";
        autocompleteEl.innerHTML = "";
        return;
    }

    const matches = countriesName.filter(c => c.toLowerCase().startsWith(val));
    autocompleteEl.style.display = matches.length ? "block" : "none";
    autocompleteEl.innerHTML = matches
        .slice(0,)
        .map(c => `<div class="autocomplete-item">${c}</div>`)
        .join("");

    autocompleteEl.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelector("#searchInput").value = item.textContent;
            autocompleteEl.style.display = "none";
            getWeather();
        });
    });
}

// FIX 3: use #searchInput not #heroCity
document.querySelector("#searchInput").addEventListener("input", autoComplete);

function applyHourly(e) {
    const target = e?.target;
    const daySelect = target?.value.slice(0, 3) || weekDay.slice(0, 3);
    const startIndex = filtered.findIndex(data => data.day === daySelect);
    const dayHourly = Array.from(document.getElementsByClassName("hourly-row"));

    if (startIndex === -1) {
        console.log("Day not found in filtered data");
        return;
    }

    for (let rowIndex = 0; rowIndex < dayHourly.length; rowIndex++) {
        const data = filtered[startIndex + rowIndex];
        if (!data) break;
        dayHourly[rowIndex].children[0].src = `https://openweathermap.org/img/wn/${weatherIcons[data.code]}@2x.png`;
        dayHourly[rowIndex].children[1].textContent = data.time;
        dayHourly[rowIndex].children[2].textContent = data.temperature;
    }
}
document.querySelector("#retryBtn").addEventListener("click" , getWeather)
document.querySelector("#daySelect").addEventListener("change", applyHourly);
searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    getWeather();
});
// document.querySelector("#retry-btn").addEventListener("click" ,getWeather)
// Call both on load
loadCountries();
