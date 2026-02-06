import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExchangeCodeRequest {
  code: string;
  application_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { code, application_id }: ExchangeCodeRequest = await req.json();

    console.log("🔐 Intercambiando código por token...");
    console.log("Application ID:", application_id);

    if (!code || !application_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Código o application_id faltante",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authUrl = Deno.env.get("AUTH_URL") || "https://auth-contaempresa.netlify.app";
    const authApiKey = Deno.env.get("AUTH_API_KEY") || "ak_production_f3307c60cd281c8e8ff629d7ab3059e5";

    const exchangeUrl = `${authUrl}/api/exchange-code`;

    console.log("🌐 Llamando a:", exchangeUrl);

    const response = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": authApiKey,
      },
      body: JSON.stringify({
        code,
        application_id,
      }),
    });

    const responseText = await response.text();
    console.log("📥 Respuesta del servidor de auth:", responseText);

    if (!response.ok) {
      console.error("❌ Error del servidor de auth:", response.status, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error del servidor de autenticación: ${response.status}`,
          details: responseText,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Error parseando respuesta:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Respuesta inválida del servidor de autenticación",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("✅ Código intercambiado exitosamente");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ Error en auth-exchange-code:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
