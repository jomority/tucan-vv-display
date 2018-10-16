document.addEventListener("DOMContentLoaded", () => {
    // Thanks to https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-input");

    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false)
    });

    ["dragenter", "dragover"].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false)
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false)
    });

    function highlight(e) {
        dropArea.classList.add("highlight")
    }

    function unhighlight(e) {
        dropArea.classList.remove("highlight")
    }

    dropArea.addEventListener("drop", function(e) {
        // Retrieve the FileList from the event
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    }, false);

    fileInput.addEventListener("change", function() {
        // Get the FileList out of the input
        handleFiles(this.files);
    }, false);
});

function handleFiles(files) {
    console.debug(files);
    if (files.length === 0) {
        return;
    }

    const file = files[0];

    const fileSize = generateSizeString(file.size);
    const fileName = file.name;

    const fileInfo = document.getElementById("file-info");
    const fileInfoSpans = fileInfo.querySelectorAll("span");
    fileInfoSpans[0].appendChild(document.createTextNode(fileName));
    fileInfoSpans[1].appendChild(document.createTextNode(fileSize));
    fileInfo.classList.remove("hidden");
    document.getElementById("drop-area").classList.add("hidden");

    const reader = new FileReader();

    // reader.addEventListener("loadend", e => console.debug(e));

    reader.onload = function(event) {
        const fileContent = event.target.result;
        const moduleHierachy = JSON.parse(fileContent);
        display(moduleHierachy);
    };

    reader.readAsText(file);
}


function display(moduleHierachy) {
    console.debug(moduleHierachy);
    const list = document.getElementById("list");
    const listItemTemplate = document.getElementById("list-item");
    const detailsTemplate = document.getElementById("details");

    const createRecursiveLists = (item, parent) => {
        const itemNode = document.importNode(listItemTemplate.content, true); // clone template node
        const li = itemNode.querySelector("li");
        const ul = li.querySelector(".children");

        const title = li.querySelector(".list-title");
        title.appendChild(document.createTextNode(item.title));

        if (item.hasOwnProperty("children") && item.children.length === 0) {
            let cp = parseInt(item.details.filter(item => item.title === "Credits")[0].details.replace(/^(\d+).*/, "$1"));
            if (isNaN(cp)) {
                cp = 0;
            }
            const badge = document.createElement("span");
            badge.classList.add("badge");
            badge.appendChild(document.createTextNode(`${cp} CP`));
            title.appendChild(badge);

            title.addEventListener("click", e => {
                preventDefaults(e);
                const detailsNode = document.importNode(detailsTemplate.content, true);
                const detailsTitle = detailsNode.querySelector("h2");

                ul.classList.toggle("hidden");
            });
        } else {
            title.addEventListener("click", e => {
                preventDefaults(e);
                ul.classList.toggle("hidden");
            });

            for (const child of item.children) {
                createRecursiveLists(child, ul);
            }
        }
        parent.appendChild(itemNode);
    };

    for (let module of moduleHierachy) {
        createRecursiveLists(module, list);
    }
}

/**
 * Lent from https://developer.mozilla.org/de/docs/Web/API/File/Zugriff_auf_Dateien_von_Webapplikationen#Beispiel_Dateigr%C3%B6%C3%9Fe_anzeigen
 */
function generateSizeString(byteSize) {
    let res = byteSize + " bytes";
    // optional code for multiples approximation
    for (let multiples = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"], multiple = 0, approx = byteSize / 1024; approx > 1; approx /= 1024, multiple++) {
        res = approx.toFixed(3) + " " + multiples[multiple] + " (" + byteSize + " bytes)";
    }

    return res;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
