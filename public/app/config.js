// /public/app/config.js

// Production builds never embed the Google Maps API key. For local development you can
// optionally create a /public/local-dev-key.js file (ignored by git) that sets
// window.__LOCAL_GOOGLE_MAPS_API_KEY__ = "YOUR_DEV_KEY";

let localDevKeyPromise = null;
let remoteKeyPromise = null;

async function loadLocalDevKey() {
    if (localDevKeyPromise) {
        return localDevKeyPromise;
    }

    localDevKeyPromise = (async () => {
        if (typeof window === "undefined") {
            return null;
        }

        if (window.__LOCAL_GOOGLE_MAPS_API_KEY__) {
            return window.__LOCAL_GOOGLE_MAPS_API_KEY__;
        }

        try {
            await import("../local-dev-key.js");
            return window.__LOCAL_GOOGLE_MAPS_API_KEY__ || null;
        } catch (error) {
            return null;
        }
    })();

    return localDevKeyPromise;
}

async function requestKeyFromServer() {
    try {
        const response = await fetch("/api/maps-key", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!data.key) {
            throw new Error("Response did not include an API key");
        }
        return data.key;
    } catch (error) {
        console.error("[config] Unable to retrieve Google Maps API key:", error);
        return null;
    }
}

export async function getGoogleMapsApiKey() {
    const localKey = await loadLocalDevKey();
    if (localKey) {
        return localKey;
    }

    if (!remoteKeyPromise) {
        remoteKeyPromise = requestKeyFromServer();
    }

    return await remoteKeyPromise;
}

// Authoritative list of Somali regions and districts used by the Somalia registration map.
export const somaliRegions = {
    "Awdal": ["Baki", "Borama", "Lughaya", "Zeila"],
    "Bakool": ["El Barde", "Hudur", "Tiyeglow", "Wajid", "Rabdhure"],
    "Banaadir": ["Abdiaziz", "Bondhere", "Daynile", "Dharkenley", "Hamar-Jajab", "Hamar-Weyne", "Hawl-Wadag", "Hodan", "Karan", "Shibis", "Shangani", "Waberi", "Wadajir", "Yaqshid"],
    "Bari": ["Alula", "Bandarbeyla", "Bosaso", "Iskushuban", "Qandala", "Ufeyn", "Qardho"],
    "Bay": ["Baidoa", "Burhakaba", "Dinsor", "Qasahdhere"],
    "Galguduud": ["Abudwak", "Adado", "Dhusa Mareb", "El Buur", "El Dher"],
    "Gedo": ["Bardhere", "Beled Hawo", "Doolow", "El Wak", "Garbaharey", "Luuq"],
    "Hiiraan": ["Beledweyne", "Buloburde", "Jalalaqsi", "Mataban", "Mahas"],
    "Lower Juba": ["Afmadow", "Badhadhe", "Jamame", "Kismayo"],
    "Lower Shabelle": ["Afgooye", "Barawa", "Kurtunwarey", "Merca", "Qoryoley", "Wanlaweyn"],
    "Middle Juba": ["Bu'ale", "Jilib", "Sakow"],
    "Middle Shabelle": ["Adan Yabal", "Balad", "Jowhar", "Mahaday"],
    "Mudug": ["Galkayo", "Goldogob", "Harardhere", "Hobyo", "Jariban"],
    "Nugaal": ["Burtinle", "Eyl", "Garowe"],
    "Sanaag": ["Badhan", "El Afweyn", "Erigavo", "Dhahar"],
    "Sool": ["Aynabo", "Las Anod", "Taleh", "Hudun"],
    "Togdheer": ["Buhoodle", "Burao", "Oodweyne", "Sheikh"]
};
