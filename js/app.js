let currentSingleModule;

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

    function highlight() {
        dropArea.classList.add("highlight")
    }

    function unhighlight() {
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
    if (files.length === 0) {
        return;
    }

    const file = files[0];

    const fileSize = generateSizeString(file.size);
    const fileName = file.name;

    const fileInfo = document.getElementById("file-info");
    const fileInfoSpans = fileInfo.querySelectorAll("span");
    const fileInfoButton = fileInfo.querySelector("button");

    fileInfoSpans[0].textContent = fileName;
    fileInfoSpans[1].textContent = fileSize;
    fileInfo.classList.remove("hidden");

    const dropArea = document.getElementById("drop-area");
    dropArea.classList.add("hidden");

    fileInfoButton.addEventListener("click", () => {
        fileInfo.classList.add("hidden");
        dropArea.reset();
        dropArea.classList.remove("hidden");
        document.getElementById("module-hierarchy").classList.add("hidden");
        document.getElementById("module-single").classList.add("hidden");
    });

    const reader = new FileReader();

    reader.onload = function(event) {
        const fileContent = event.target.result;
        const moduleHierachyRaw = JSON.parse(fileContent);
        const moduleHierachy = process(moduleHierachyRaw);
        display(moduleHierachy);
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

    const processRec = (node) => {
        if (node.hasOwnProperty("title") && node.hasOwnProperty("children")) {
            // Check if it is a Module (a leaf node)
            if (node.hasOwnProperty("details") && node.children.length === 0) {
                let cp = parseInt(node.details.filter(item => item.title === "Credits")[0].details.replace(/^(\d+).*/, "$1"));
                if (isNaN(cp)) {
                    cp = 0;
                }

                const titleMatched = node.title.match(/(\d\d-\w\w-\d{4}) (.+) \(((Wi|So)Se \d\d\d\d\/\d\d)\)/);

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


function display(moduleHierachy) {
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

                if (node === currentSingleModule) {
                    singleElem.classList.toggle("hidden");
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
                        const detailElems = htmlToElements(detail.details);
                        singleDetailsElem.appendChild(titleElem);
                        detailElems.forEach(e => singleDetailsElem.appendChild(e));
                    }

                    singleElem.classList.remove("hidden");
                    currentSingleModule = node;
                }
            });
        } else {
            title.addEventListener("click", e => {
                preventDefaults(e);
                childrenElem.classList.toggle("hidden");
            });

            node.children.forEach(child => createRecursiveLists(child, childrenElem));
        }

        parent.appendChild(templateClone);
    };

    moduleHierachy.forEach(child => createRecursiveLists(child, listElem));

    containerElem.classList.remove("hidden");
}

/**
 * Borrowed from https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
 *
 * @param html the HTML
 * @returns {NodeListOf<Node & ChildNode>}
 */
function htmlToElements(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.childNodes;
}

/**
 * Borrowed from https://developer.mozilla.org/de/docs/Web/API/File/Zugriff_auf_Dateien_von_Webapplikationen#Beispiel_Dateigr%C3%B6%C3%9Fe_anzeigen
 */
function generateSizeString(byteSize) {
    let res = byteSize + " bytes";
    for (let multiples = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"], multiple = 0, approx = byteSize / 1024; approx > 1; approx /= 1024, multiple++) {
        res = `${approx.toFixed(3)} ${multiples[multiple]}`;
    }
    return res;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
