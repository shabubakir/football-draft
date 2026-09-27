"use client";

// ============================================================
// AUTH CALLBACK PAGE — обработчик OAuth callback
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase автоматически подхватывает access_token из URL
        // и создаёт сессию. Нужно просто подождать, пока auth state обновится.
        
        if (!supabase) {
          setStatus("error");
          setErrorMsg("Supabase не настроен");
          return;
        }

        // Дать время Supabase обработать callback
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Проверить, есть ли session
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          setStatus("success");
          
          // Получить returnTo из URL
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get("returnTo") || "/";
          
          // Перенаправить на главную через секунду
          setTimeout(() => {
            router.replace(returnTo.startsWith("/") ? returnTo : "/");
          }, 1000);
        } else {
          setStatus("error");
          setErrorMsg("Не удалось получить сессию после авторизации");
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        setStatus("error");
        setErrorMsg("Ошибка при обработке авторизации");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 text-center">
            <small className="text-[11px] tracking-[0.25em] text-emerald-200">
              FOOTBALL DRAFT
            </small>
            <h1 className="mt-2 text-2xl font-black">
              {status === "processing" && "ОБРАБОТКА..."}
              {status === "success" && "УСПЕХ!"}
              {status === "error" && "ОШИБКА"}
            </h1>
          </div>

          <div className="p-6 text-center">
            {status === "processing" && (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                <p className="text-stone-600">Завершаем авторизацию...</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-stone-600">Авторизация успешна! Перенаправляем...</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-rose-600">{errorMsg}</p>
                <button
                  onClick={() => router.push("/")}
                  className="rounded-2xl bg-emerald-600 text-white font-bold px-6 py-3 hover:bg-emerald-500 transition"
                >
                  Вернуться на главную
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


