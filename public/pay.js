async function pay() {
  const email = prompt("ใส่ email:");

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("error: " + JSON.stringify(data));
  }
}
EOcat >> .env <<'EOF'
STRIPE_SECRET_KEY=sk_live_xxxxxxxxx
STRIPE_PRICE_ID=price_live_xxxxxxxxx
