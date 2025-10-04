import { apiRequest } from "../apiClient";

/**
 * Betalningsservice
 * Hanterar betalningar, fakturering och transaktioner
 */
export class PaymentService {
  /**
   * Skapa betalning
   */
  static async createPayment(paymentData) {
    try {
      const res = await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify(paymentData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Betalning misslyckades");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid skapande av betalning:", error);
      throw error;
    }
  }

  /**
   * Bekräfta betalning
   */
  static async confirmPayment(paymentId) {
    try {
      const res = await apiRequest(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Betalningsbekräftelse misslyckades");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid bekräftelse av betalning:", error);
      throw error;
    }
  }

  /**
   * Avbryt betalning
   */
  static async cancelPayment(paymentId) {
    try {
      const res = await apiRequest(`/api/payments/${paymentId}/cancel`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Betalningsavbrott misslyckades");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid avbrott av betalning:", error);
      throw error;
    }
  }

  /**
   * Hämta betalningsstatus
   */
  static async getPaymentStatus(paymentId) {
    try {
      const res = await apiRequest(`/api/payments/${paymentId}/status`);
      if (!res.ok) {
        const err = new Error(`Payment status ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av betalningsstatus:", error);
      throw error;
    }
  }

  /**
   * Hämta användarens betalningar
   */
  static async fetchUserPayments() {
    try {
      const res = await apiRequest("/api/payments/user");
      if (!res.ok) {
        const err = new Error(`User payments ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av användarbetalningar:", error);
      throw error;
    }
  }

  /**
   * Hämta betalningsmetoder
   */
  static async fetchPaymentMethods() {
    try {
      const res = await apiRequest("/api/payments/methods");
      if (!res.ok) {
        const err = new Error(`Payment methods ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av betalningsmetoder:", error);
      throw error;
    }
  }

  /**
   * Validera betalningsdata
   */
  static async validatePayment(paymentData) {
    try {
      const res = await apiRequest("/api/payments/validate", {
        method: "POST",
        body: JSON.stringify(paymentData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Betalningsvalidering misslyckades");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid validering av betalning:", error);
      throw error;
    }
  }

  /**
   * Hämta faktura
   */
  static async fetchInvoice(invoiceId) {
    try {
      const res = await apiRequest(`/api/payments/invoice/${invoiceId}`);
      if (!res.ok) {
        const err = new Error(`Invoice ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av faktura:", error);
      throw error;
    }
  }

  /**
   * Ladda ner faktura som PDF
   */
  static async downloadInvoicePDF(invoiceId) {
    try {
      const res = await apiRequest(`/api/payments/invoice/${invoiceId}/pdf`);
      if (!res.ok) {
        const err = new Error(`Invoice PDF ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.blob();
    } catch (error) {
      console.error("Fel vid nedladdning av faktura PDF:", error);
      throw error;
    }
  }
}

// Export för bakåtkompatibilitet
export const createPayment = PaymentService.createPayment;
export const confirmPayment = PaymentService.confirmPayment;
export const cancelPayment = PaymentService.cancelPayment;
export const getPaymentStatus = PaymentService.getPaymentStatus;
export const fetchUserPayments = PaymentService.fetchUserPayments;
export const fetchPaymentMethods = PaymentService.fetchPaymentMethods;
export const validatePayment = PaymentService.validatePayment;
export const fetchInvoice = PaymentService.fetchInvoice;
export const downloadInvoicePDF = PaymentService.downloadInvoicePDF;
