export function showHouseholdTurnOverlay(turnType) {
    // Remove existing overlay
    document.getElementById("household-turn")?.remove();

    const label =
        turnType === "reaction"
            ? "Reaction Turn"
            : "Action Turn";

    const icon =
        turnType === "reaction"
            ? "/systems/household/assets/sheet/icon-shield.png"
            : "/systems/household/assets/sheet/icon-gear.png";

    const soundPath = "/systems/household/assets/sound/cinematic-boom-405463.mp3";
    const figure = document.createElement("figure");
    figure.id = "household-turn";
    figure.classList.add("next-turn");
    figure.style.pointerEvents = "none";
    figure.style.width = "100%";
    figure.style.background = "linear-gradient(to right, transparent 0%, var(--hh-border-strong) 40%, var(--color-cool-5-50) 60%, transparent 100%)";
    figure.style.textAlign = "center";
    figure.style.justifyContent = "center";
    figure.style.display = "flex";
    figure.style.flexDirection = "column";


    figure.innerHTML = `
    <img src="${icon}" class="fa-bounce" style="width: 100px; height: 100px; border: 0; filter: none; box-shadow: none;">
    <figcaption style="font-size: var(--font-size-24);">${label}</figcaption>
  `;

    // --- SAFE INSERTION ---
    //const board = document.getElementById("board");
    const canvas = document.getElementById("ui-top");

    if (canvas) {
        canvas.parentNode.insertBefore(figure, canvas.nextSibling);
        //alert("dasd")
    }

    // Auto-remove
    const interfaceVolume = game.settings.get("core", "globalInterfaceVolume");
    foundry.audio.AudioHelper.play({src: soundPath, volume: interfaceVolume, loop: false}, true);
    setTimeout(() => figure.remove(), 2200);
}
