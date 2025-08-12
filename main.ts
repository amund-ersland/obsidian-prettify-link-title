import { App, Plugin, Editor, MarkdownView, Setting, PluginSettingTab } from "obsidian";

interface RegexReplacement {
    search: string;
    replace: string;
}

export default class PrettyLinkTitlesPlugin extends Plugin {
    public settings: RegexReplacement[] = [];

    async onload() {
        // Load settings
        await this.loadSettings();

        // Add command
        this.addCommand({
            id: "prettify-links",
            name: "Prettify Internal Link Titles",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const lineCount = editor.lineCount();

                for (let lineNum = 0; lineNum < lineCount; lineNum++) {
                    const line = editor.getLine(lineNum);

                    // Only process lines that contain potential links
                    if (line.includes("[[")) {
                        const prettifiedLine = this.prettifyLinksInLine(line);

                        // Replace line only if changed
                        if (prettifiedLine !== line) {
                            editor.setLine(lineNum, prettifiedLine);
                        }
                    }
                }
            },
        });

        // Add settings tab
        this.addSettingTab(new PrettyLinkTitlesSettings(this.app, this));
    }

    async loadSettings() {
        this.settings = await this.loadData() || [];
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    prettifyLinksInLine(line: string): string {
        const regex = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/g;

        return line.replace(regex, (match, link, alias) => {
            if (alias) return match; // Already has a title

            let pretty = link;

            // Apply all regex replacements in order
            for (const replacement of this.settings) {
                try {
                    const searchRegex = new RegExp(replacement.search, 'g');
                    pretty = pretty.replace(searchRegex, replacement.replace);
                } catch (e) {
                    console.error("Invalid regex pattern:", replacement.search, e);
                }
            }

            return `[[${link}|${pretty}]]`;
        });
    }
}

class PrettyLinkTitlesSettings extends PluginSettingTab {
    constructor(app: App, private plugin: PrettyLinkTitlesPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty(); // Clear any previous content

        containerEl.createEl('h2', { text: 'Pretty Link Titles Settings' });

        // Add a button to add new regex replacement
        new Setting(containerEl)
            .setName('Add Regex Replacement')
            .setDesc('Add a new regex search/replace pair')
            .addButton((button) => {
                button.setButtonText('Add')
                    .onClick(async () => {
                        this.plugin.settings.push({ search: '', replace: '' });
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings tab
                    });
            });

        // Display existing settings
        for (const [index, setting] of this.plugin.settings.entries()) {
            new Setting(containerEl)
                .setName(`Search ${index + 1}`)
                .addText(text => text
                    .setValue(setting.search)
                    .onChange(async (value) => {
                        this.plugin.settings[index].search = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName(`Replace ${index + 1}`)
                .addText(text => text
                    .setValue(setting.replace)
                    .onChange(async (value) => {
                        this.plugin.settings[index].replace = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
