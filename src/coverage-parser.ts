import { parseContent as parseContentClover } from "@cvrg-report/clover-json";
import * as vscodeLogging from '@vscode-logging/logger';
import { parseContent as parseContentCobertura } from "cobertura-parse";
import { parseContent as parseContentJacoco } from "jacoco-parse";
import { Section, source } from "lcov-parse";
import { CoverageFile, CoverageType } from "./coverage-file";
import { WorkspaceFolderCoverage, WorkspaceFolderCoverageFiles } from "./workspace-folder-coverage-file";


export class CoverageParser {

    constructor(private readonly logger: vscodeLogging.IVSCodeExtLogger) {
    }

    /**
     * Extracts coverage sections of type xml and lcov
     * @param workspaceFolders array of coverage files in string format
     */
    public async filesToSections(workspaceFolders: Set<WorkspaceFolderCoverageFiles>): Promise<Set<WorkspaceFolderCoverage>> {
        let workspaceCoverage = new Set<WorkspaceFolderCoverage>();

        for (const folder of workspaceFolders) {

            let workspaceFolderCoverage = new Map<string, Section>();

            for (const file of folder.coverageFiles) {

                // file is an array
                let coverage: Map<string, Section> = new Map<string, Section>();

                // get coverage file type
                const coverageFile = new CoverageFile(file.content);
                switch (coverageFile.type) {
                    case CoverageType.CLOVER:
                        coverage = await this.xmlExtractClover(file.path, file.content);
                        break;
                    case CoverageType.JACOCO:
                        coverage = await this.xmlExtractJacoco(file.path, file.content);
                        break;
                    case CoverageType.COBERTURA:
                        coverage = await this.xmlExtractCobertura(file.path, file.content);
                        break;
                    case CoverageType.LCOV:
                        coverage = await this.lcovExtract(file.path, file.content);
                        break;
                    default:
                        break;
                }
                // add new coverage map to existing coverages generated so far
                workspaceFolderCoverage = new Map([...workspaceFolderCoverage, ...coverage]);
            }

            workspaceCoverage.add(new WorkspaceFolderCoverage(folder.workspaceFolder, workspaceFolderCoverage));
        }

        return workspaceCoverage;
    }

    private async convertSectionsToMap(data: Section[]): Promise<Map<string, Section>> {
        const sections = new Map<string, Section>();
        const addToSectionsMap = async (section: { title: string; file: string; }) => {
            //TODO change the key as the rootpath has to be handled differently for multi-folder workspaces
            sections.set(section.file, section);
        };

        // convert the array of sections into an unique map
        const addPromises = data.map(addToSectionsMap);
        await Promise.all(addPromises);
        return sections;
    }

    private xmlExtractCobertura(filename: string, xmlFile: string) {
        return new Promise<Map<string, Section>>((resolve, reject) => {
            const checkError = (err: Error) => {
                if (err) {
                    err.message = `filename: ${filename} ${err.message}`;
                    this.handleError("cobertura-parse", err);
                    return resolve(new Map<string, Section>());
                }
            };

            try {
                parseContentCobertura(xmlFile, async (err: any, data: any[]) => {
                    checkError(err);
                    const sections = await this.convertSectionsToMap(data);
                    return resolve(sections);
                }, true);
            } catch (error) {
                checkError(error);
            }
        });
    }

    private xmlExtractJacoco(filename: string, xmlFile: string) {
        return new Promise<Map<string, Section>>((resolve, reject) => {
            const checkError = (err: Error) => {
                if (err) {
                    err.message = `filename: ${filename} ${err.message}`;
                    this.handleError("jacoco-parse", err);
                    return resolve(new Map<string, Section>());
                }
            };

            try {
                parseContentJacoco(xmlFile, async (err: any, data: any[]) => {
                    checkError(err);
                    const sections = await this.convertSectionsToMap(data);
                    return resolve(sections);
                });
            } catch (error) {
                checkError(error);
            }
        });
    }

    private async xmlExtractClover(filename: string, xmlFile: string) {
        try {
            const data = await parseContentClover(xmlFile);
            const sections = await this.convertSectionsToMap(data);
            return sections;
        } catch (error) {
            error.message = `filename: ${filename} ${error.message}`;
            this.handleError("clover-parse", error);
            return new Map<string, Section>();
        }
    }

    private lcovExtract(filename: string, lcovFile: string) {
        return new Promise<Map<string, Section>>((resolve, reject) => {
            const checkError = (err: Error) => {
                if (err) {
                    err.message = `filename: ${filename} ${err.message}`;
                    this.handleError("lcov-parse", err);
                    return resolve(new Map<string, Section>());
                }
            };

            try {
                source(lcovFile, async (err: Error, data: any[]) => {
                    checkError(err);
                    const sections = await this.convertSectionsToMap(data);
                    return resolve(sections);
                });
            } catch (error) {
                checkError(error);
            }
        });
    }

    private handleError(system: string, error: Error) {
        const message = error.message ? error.message : error;
        const stackTrace = error.stack;
        this.logger.error(
            `[${Date.now()}][coverageparser][${system}]: Error: ${message}\n${stackTrace}`,
        );
    }
}