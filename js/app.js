let currentSingleModule;

document.addEventListener("DOMContentLoaded", () => {
    // Thanks to https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/

    const dropArea = document.getElementById("file-form");

    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    // Debounce the highlighting
    const wait = 100;
    const highlight = {
        toHighlight: true,
        yes() {
            if (typeof this.timeout !== "number" || !this.toHighlight) {
                if (!this.toHighlight) {
                    window.clearTimeout(this.timeout);
                }
                this.timeout = window.setTimeout(() => dropArea.classList.add("drop-highlight"), wait);
            }
            this.toHighlight = true;
        },
        no() {
            if (typeof this.timeout !== "number" || this.toHighlight) {
                if (this.toHighlight) {
                    window.clearTimeout(this.timeout);
                }
                this.timeout = window.setTimeout(() => dropArea.classList.remove("drop-highlight"), wait);
            }
            this.toHighlight = false;
        }
    };

    ["dragenter", "dragover"].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight.yes, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight.no, false);
    });

    dropArea.addEventListener(
        "drop",
        e => {
            // Retrieve the FileList from the event
            const dt = e.dataTransfer;
            handleFiles(dt.files);
        },
        false
    );

    const fileInput = document.getElementById("file-input");

    fileInput.addEventListener(
        "change",
        function() {
            // Get the FileList out of the input
            handleFiles(this.files);
        },
        false
    );
});

function handleFiles(files) {
    if (files.length === 0) {
        return;
    }

    const file = files[0];

    const fileSize = generateSizeString(file.size);
    const fileName = file.name;

    const fileInfoName = document.getElementById("file-info-name");
    const fileInfoSize = document.getElementById("file-info-size");
    const fileInfoButton = document.getElementById("file-remove");

    fileInfoName.textContent = fileName;
    fileInfoSize.textContent = fileSize;

    fileInfoButton.addEventListener("click", () => {
        document.getElementById("file-form").reset();
        modifyViewState(false);
    });

    const reader = new FileReader();

    reader.onload = function(event) {
        const fileContent = event.target.result;
        const moduleHierachyRaw = JSON.parse(fileContent);
        const moduleHierachy = process(moduleHierachyRaw);
        view(moduleHierachy);
    };

    reader.readAsText(file);
}

class HierachyItem {
    constructor(title, children = []) {
        this.title = title;
        this.children = children;
    }
}

class Module {
    constructor(title, tucanNumber, semester, cp, details = []) {
        this.title = title;
        this.details = details;
        this.cp = cp;
        this.tucanNumber = tucanNumber;
        this.semester = semester;
    }
}

function process(moduleHierachy) {
    const processRec = node => {
        if (node.hasOwnProperty("title") && node.hasOwnProperty("children")) {
            // Check if it is a Module (a leaf node)
            if (node.hasOwnProperty("details") && node.children.length === 0) {
                let cp = parseInt(node.details.filter(item => item.title === "Credits")[0].details.replace(/^(\d+).*/, "$1"));
                if (isNaN(cp)) {
                    cp = 0;
                }

                const titleMatched = node.title.match(/(\d\d-\w\w-\w{4}(?:\/\w+)?) (.+) \(((?:Wi|So)Se \d\d\d\d(?:\/\d\d)?)\)/);

                return new Module(titleMatched[2], titleMatched[1], titleMatched[3], cp, node.details);
            } else if (node.children.length > 0) {
                let nodeProcessed = new HierachyItem(node.title);

                let children;

                // Check for nested nodes with the same title as TUCaN produces them often
                if (node.children.length === 1 && node.children[0].title === node.title) {
                    children = node.children[0].children.map(processRec);
                } else {
                    children = node.children.map(processRec);
                }

                nodeProcessed.children = nodeProcessed.children.concat(children.filter(item => item !== null));
                return nodeProcessed;
            }
        }

        return null;
    };

    return moduleHierachy.map(processRec).filter(item => item !== null);
}

function view(moduleHierachy) {
    const containerElem = document.getElementById("module-hierarchy");
    const listElem = containerElem.querySelector(":scope > ul");
    const listItemTemplate = document.getElementById("list-item");

    const createRecursiveLists = (node, parent) => {
        const templateClone = document.importNode(listItemTemplate.content, true); // clone template node
        const itemElem = templateClone.querySelector("li");
        const childrenElem = itemElem.querySelector(".children");

        const title = itemElem.querySelector(".list-title");
        title.appendChild(document.createTextNode(node.title));

        if (node instanceof Module) {
            const badge = document.createElement("span");
            badge.classList.add("badge");
            badge.appendChild(document.createTextNode(`${node.cp} CP`));
            title.appendChild(badge);

            itemElem.removeChild(childrenElem);

            title.addEventListener("click", e => {
                preventDefaults(e);
                const singleElem = document.getElementById("module-single");

                const toggleSingleElem = (show = true) => {
                    if (show) {
                        singleElem.classList.remove("hide");
                        // Only scroll to single view if it is below the hierachy list
                        if (!window.matchMedia("(min-width: 62.5rem)").matches) {
                            singleElem.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    } else {
                        singleElem.classList.add("hide");
                    }
                };

                if (node === currentSingleModule) {
                    toggleSingleElem(singleElem.classList.contains("hide"));
                } else {
                    const singleTitleElem = singleElem.querySelector("h2");
                    const singleDetailsElem = singleElem.querySelector(".details");
                    singleTitleElem.textContent = `${node.tucanNumber} ${node.title} ${node.semester}`;

                    // Clear detail child nodes
                    while (singleDetailsElem.firstChild) {
                        singleDetailsElem.removeChild(singleDetailsElem.firstChild);
                    }

                    for (let detail of node.details) {
                        const titleElem = document.createElement("h3");
                        titleElem.textContent = detail.title;
                        const detailElem = document.createElement("p");
                        detailElem.innerHTML = detail.details;
                        singleDetailsElem.appendChild(titleElem);
                        singleDetailsElem.appendChild(detailElem);
                    }

                    toggleSingleElem();
                    currentSingleModule = node;
                }
            });
        } else {
            title.addEventListener("click", e => {
                preventDefaults(e);
                childrenElem.classList.toggle("hide");
            });

            node.children.forEach(child => createRecursiveLists(child, childrenElem));
        }

        parent.appendChild(templateClone);
    };

    moduleHierachy.forEach(child => createRecursiveLists(child, listElem));

    document.querySelectorAll(".init-hide").forEach(item => item.classList.remove("init-hide"));

    modifyViewState(true);
}

function modifyViewState(fileLoaded = false) {
    const elementsFileNotLoaded = document.querySelectorAll(".site-intro, .site-info");
    const elementsFileLoaded = document.querySelectorAll("#file-info, .site-content" + (!fileLoaded ? ", #module-single" : "")); // the single part should initially remain hidden unless a module is clicked

    if (fileLoaded) {
        elementsFileNotLoaded.forEach(elem => elem.classList.add("hide"));
        elementsFileLoaded.forEach(elem => elem.classList.remove("hide"));
    } else {
        elementsFileLoaded.forEach(elem => elem.classList.add("hide"));
        elementsFileNotLoaded.forEach(elem => elem.classList.remove("hide"));
    }
}

/**
 * Borrowed from https://developer.mozilla.org/de/docs/Web/API/File/Zugriff_auf_Dateien_von_Webapplikationen#Beispiel_Dateigr%C3%B6%C3%9Fe_anzeigen
 */
function generateSizeString(byteSize) {
    let res = byteSize + " bytes";
    for (
        let multiples = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"], multiple = 0, approx = byteSize / 1024;
        approx > 1;
        approx /= 1024, multiple++
    ) {
        res = `${approx.toFixed(3)} ${multiples[multiple]}`;
    }
    return res;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
