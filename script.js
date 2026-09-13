const tablinks = document.getElementsByClassName("tab-links");
const tabcontents = document.getElementsByClassName("tab-contents");

function opentab(tabname, event) {
  for (let tablink of tablinks) {
    tablink.classList.remove("active-link");
  }

  for (let tabcontent of tabcontents) {
    tabcontent.classList.remove("active-tab");
  }

  event.currentTarget.classList.add("active-link");
  document.getElementById(tabname).classList.add("active-tab");
}

const sidemenu = document.getElementById("sidemenu");

function openmenu() {
  sidemenu.classList.add("show-menu");
}

function closemenu() {
  sidemenu.classList.remove("show-menu");
}