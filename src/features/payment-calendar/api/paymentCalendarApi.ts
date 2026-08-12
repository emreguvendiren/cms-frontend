import { getAccessToken } from "../../auth";
import { environment } from "../../../shared/config/environment";
import { getPaymentCalendar, type PaymentCalendar } from "../../../shared/api/generated";

function clientOptions() {
  return {
    auth: getAccessToken() ?? undefined,
    baseUrl: environment.apiBaseUrl,
    credentials: "include" as const,
    throwOnError: true as const,
  };
}

export async function loadPaymentCalendar(month: string): Promise<PaymentCalendar> {
  const response = await getPaymentCalendar({ ...clientOptions(), query: { month } });
  return response.data;
}

export type { PaymentCalendar, PaymentCalendarItem } from "../../../shared/api/generated";
