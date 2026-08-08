import { loadClasses, type CourseClass } from "../../courses/api/trainingApi";

const CALENDAR_PAGE_SIZE = 100;

export async function loadCalendarClasses(): Promise<CourseClass[]> {
  const classes: CourseClass[] = [];
  let pageNumber = 0;
  let lastPage = false;

  while (!lastPage) {
    const page = await loadClasses({ search: "", page: pageNumber, size: CALENDAR_PAGE_SIZE });
    classes.push(...page.content);
    lastPage = page.last;
    pageNumber += 1;
  }

  return classes;
}

export type { CourseClass } from "../../courses/api/trainingApi";
