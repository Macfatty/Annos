# ErrorBoundary - En komplett guide

## Vad är ErrorBoundary?

ErrorBoundary är en React-komponent som fångar JavaScript-fel i hela komponentträdet under sig, loggar dessa fel och visar en fallback UI istället för att hela applikationen kraschar.

### Varför behövs ErrorBoundary?

- **Förhindrar applikationskrasch**: Utan ErrorBoundary kan ett fel i en komponent få hela appen att sluta fungera
- **Bättre användarupplevelse**: Användaren ser en vänlig felmeddelande istället för en vit skärm
- **Felrapportering**: Fel loggas automatiskt för utvecklare att analysera
- **Isolerade fel**: Ett fel i en del av appen påverkar inte andra delar

## Hur fungerar ErrorBoundary?

### 1. Klasskomponent krävs
ErrorBoundary måste vara en klasskomponent eftersom React hooks inte kan hantera fel på samma sätt.

### 2. Två viktiga metoder

#### `getDerivedStateFromError(error)`
- Statisk metod som körs när ett fel upptäcks
- Uppdaterar komponentens state för att visa fallback UI
- Måste returnera ett nytt state-objekt

#### `componentDidCatch(error, errorInfo)`
- Körs när ett fel upptäcks
- Används för att logga fel och skicka till felrapporteringstjänster
- Får både felet och information om var felet uppstod

### 3. Fallback UI
När `hasError` är `true` visas en användarvänlig felmeddelande istället för den trasiga komponenten.

## Kodexempel

### Grundläggande ErrorBoundary

```jsx
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Uppdatera state så att nästa render visar fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Logga felet
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error: error });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div>
          <h2>Något gick fel!</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Försök igen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Användning

```jsx
// Wrap komponenter som kan krascha
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Eller wrap hela appen
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Var används ErrorBoundary i vårt projekt?

### 1. Root-nivå (main.jsx)
```jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Syfte**: Fångar alla fel i hela applikationen och förhindrar att appen kraschar helt.

### 2. KurirVy-komponenten (App.jsx)
```jsx
<Route path="/kurir" element={
  <ErrorBoundary>
    <KurirVy />
  </ErrorBoundary>
} />
<Route path="/kurir-vy" element={
  <ErrorBoundary>
    <KurirVy />
  </ErrorBoundary>
} />
```

**Syfte**: Isolerar fel i kurirfunktionaliteten så att resten av appen fortsätter fungera.

### 3. RestaurangVy-komponenten (App.jsx)
```jsx
<Route path="/restaurang/:slug/incoming" element={
  <ErrorBoundary>
    <RestaurangVy />
  </ErrorBoundary>
} />
<Route path="/restaurang-vy" element={
  <ErrorBoundary>
    <RestaurangVy />
  </ErrorBoundary>
} />
```

**Syfte**: Skyddar restauranghanteringsfunktionaliteten från fel som kan uppstå vid orderhantering.

### 4. AdminPanel-komponenten (App.jsx)
```jsx
<Route path="/admin" element={
  <ErrorBoundary>
    <AdminPanel />
  </ErrorBoundary>
} />
```

**Syfte**: Isolerar fel i adminfunktionaliteten för att förhindra att hela systemet påverkas.

### 5. Checkout-komponenten (App.jsx)
```jsx
<Route path="/checkout" element={
  <ErrorBoundary>
    <Checkout
      varukorg={varukorg}
      setVarukorg={setVarukorg}
      restaurant_slug={restaurant_slug}
    />
  </ErrorBoundary>
} />
```

**Syfte**: Skyddar den kritiska checkout-processen från fel som kan förhindra beställningar.

## Felhanteringsstrategi i Annos-projektet

### Hierarkisk felhantering
Vi använder en hierarkisk approach med ErrorBoundary på flera nivåer:

1. **Global nivå**: Fångar alla oväntade fel i hela applikationen
2. **Route-nivå**: Isolerar fel per funktionalitetsområde (kurir, restaurang, admin, checkout)
3. **Komponent-nivå**: Skyddar kritiska komponenter från att krascha

### Komponenter som omfattas
- **KurirVy**: Hanterar kurirfunktionalitet och orderleverans
- **RestaurangVy**: Hanterar restaurangorder och statusuppdateringar
- **AdminPanel**: Administrativa funktioner och systemhantering
- **Checkout**: Kritiska beställningsprocesser och betalningar

### Felhantering i UI
ErrorBoundary visar användarvänliga felmeddelanden med:
- Tydliga instruktioner för användaren
- "Försök igen"-knapp för att återställa komponenten
- "Ladda om sidan"-knapp som fallback
- Tekniska detaljer endast i utvecklingsläge

## Vad fångar ErrorBoundary?

### ✅ Fångar:
- Fel i render-metoder
- Fel i livscykelmetoder
- Fel i konstruktorer av komponenter under sig

### ❌ Fångar INTE:
- Fel i event handlers
- Fel i asynkron kod (setTimeout, promises)
- Fel under server-side rendering
- Fel i själva ErrorBoundary-komponenten

## Vanliga frågor och problem

### Q: Varför ser jag fortfarande fel i konsolen?
A: ErrorBoundary förhindrar inte att fel loggas till konsolen - det är bra för utveckling. Den förhindrar bara att appen kraschar.

### Q: Kan jag ha flera ErrorBoundary-komponenter?
A: Ja! Det är faktiskt rekommenderat att ha ErrorBoundary på olika nivåer för att isolera fel.

### Q: Vad händer med state när ett fel uppstår?
A: Komponenten som kraschar förlorar sitt state, men ErrorBoundary kan återställa sig själv med "Försök igen"-knappen.

### Q: Hur hanterar jag fel i event handlers?
A: Använd try-catch i event handlers:
```jsx
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    console.error("Fel i event handler:", error);
    // Hantera felet här
  }
};
```

### Q: Kan jag skicka fel till en extern tjänst?
A: Ja, i `componentDidCatch`:
```jsx
componentDidCatch(error, errorInfo) {
  // Skicka till Sentry, LogRocket, etc.
  Sentry.captureException(error, { extra: errorInfo });
}
```

## Best practices

### 1. Placering
- **Root-nivå**: Fångar alla oväntade fel
- **Route-nivå**: Isolerar fel per sida
- **Komponent-nivå**: För kritiska komponenter

### 2. Felmeddelanden
- Använd vänliga, icke-tekniska meddelanden
- Ge användaren alternativ (försök igen, gå tillbaka)
- Visa tekniska detaljer endast i utvecklingsläge

### 3. Loggning
- Logga alltid fel för debugging
- Inkludera kontext och användaråtgärder
- Använd strukturerad loggning

### 4. Testning
```jsx
// Testa ErrorBoundary med en komponent som kastar fel
const ThrowError = () => {
  throw new Error("Test error");
};

// I din test
<ErrorBoundary>
  <ThrowError />
</ErrorBoundary>
```

## Felsökning

### Problem: ErrorBoundary visar inte fallback UI
**Lösning**: Kontrollera att felet uppstår i render-metoden, inte i event handlers.

### Problem: "Cannot read property of undefined"
**Lösning**: Lägg till null-checks och default-värden:
```jsx
const data = props.data || [];
const name = props.user?.name || "Okänd användare";
```

### Problem: Infinite loop i ErrorBoundary
**Lösning**: Se till att "Försök igen"-knappen återställer state korrekt:
```jsx
handleRetry = () => {
  this.setState({ hasError: false, error: null });
};
```

## Ytterligare resurser

- [React Error Boundaries dokumentation](https://reactjs.org/docs/error-boundaries.html)
- [Error Boundary best practices](https://reactjs.org/docs/error-boundaries.html#error-boundaries)
- [Sentry för felrapportering](https://sentry.io/for/react/)

---

*Denna guide hjälper dig att förstå och implementera ErrorBoundary korrekt i React-applikationer. Kom ihåg att ErrorBoundary är ett kraftfullt verktyg för att förbättra användarupplevelsen och applikationens stabilitet.*
