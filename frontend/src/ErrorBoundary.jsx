import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    // Uppdatera state så att nästa render visar fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Logga felet till konsolen eller en felrapporteringstjänst
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          margin: "1rem"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ color: "#dc3545", marginBottom: "1rem" }}>
            Något gick fel
          </h2>
          <p style={{ marginBottom: "2rem", color: "#6c757d" }}>
            Ett oväntat fel uppstod. Vi arbetar på att lösa problemet.
          </p>
          
          <div style={{ marginBottom: "2rem" }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "1rem"
              }}
              aria-label="Försök igen"
            >
              🔄 Försök igen
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              aria-label="Ladda om sidan"
            >
              🔄 Ladda om sidan
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              textAlign: "left",
              maxWidth: "600px",
              width: "100%"
            }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "1rem" }}>
                Teknisk information (endast i utvecklingsläge)
              </summary>
              <div style={{ fontSize: "0.9rem" }}>
                <h4>Fel:</h4>
                <pre style={{
                  backgroundColor: "#f8f9fa",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap"
                }}>
                  {this.state.error && this.state.error.toString()}
                </pre>
                
                <h4>Stack trace:</h4>
                <pre style={{
                  backgroundColor: "#f8f9fa",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontSize: "0.8rem"
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
