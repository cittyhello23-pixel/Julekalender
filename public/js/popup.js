//finner elementet vi vil gjøre noe med og gjør det til et objekt
const loginPopup = document.getElementById("loginPopup");


//hvis det er en loginpopup (aka hvis man er i en luke og man ikke er logget in), skal den vise loginpopup visuelt også. 
if (loginPopup) {
  loginPopup.style.display = "flex";
}

//hvis det er en popup og man trykker på lukk, så fjerner den elementet
function closePopup() {
  if (loginPopup) {
    loginPopup.style.display = "none";
  }
}
