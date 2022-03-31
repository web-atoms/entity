import DateTime from "@web-atoms/date-time/dist/DateTime";

interface IDbFunctions {

    /**
     * Explicitly specifies a collation to be used in a LINQ query. Can be used to generate fragments such as WHERE customer.name COLLATE 'de_DE' = 'John Doe'.
     * The available collations and their names vary across databases, consult your database's documentation for more information.
     * @param operand The operand to which to apply the collation.
     * @param collation The name of the collation.
     * @returns string
     */
    collate(operand: any, collation: string): string;

    /**
     * A DbFunction method stub that can be used in LINQ queries to target the SQL Server CONTAINS store function.
     * @param propertyReference The property on which the search will be performed.
     * @param searchCondition The text that will be searched for in the property and the condition for a match.
     * @param languageTerm A Language ID from the sys.syslanguages table.
     * @returns boolean
     */
    contains(propertyReference: any, searchCondition: string, languageTerm?: number): boolean;

    /**
     * Returns the number of bytes used to represent any expression.
     * @param arg The value to be examined for data length
     * @returns number
     */
    dataLength(arg: any): number;

    /**
     * Counts the number of day boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(day, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffDay(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of hour boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(hour, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffHour(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Microsecond boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(microsecond, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffMicrosecond(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Millisecond boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(millisecond, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffMillisecond(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Minute boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(minute, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffMinute(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Month boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(month, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffMonth(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Nanosecond boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(nanosecond, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffNanosecond(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Second boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(second, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffSecond(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Week boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(week, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffWeek(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Counts the number of Year boundaries crossed between the `startDate` and `endDate`.
     * Corresponds to SQL Server's `DATEDIFF(year, @startDate, @endDate)`.
     * @param startDate Starting date for the calculation
     * @param endDate Ending date for the calculation
     * @returns number
     */
    dateDiffYear(startDate: DateTime | Date, endDate: DateTime | Date): number;

    /**
     * Initializes a new instance of the DateTime structure to the specified year, month, day, hour, minute, second, and millisecond.
     * Corresponds to the SQL Server's DATETIMEFROMPARTS(year, month, day, hour, minute, second, millisecond).
     * @param year The Year from 1753 to 9999
     * @param month 1 to 12
     * @param day 1 to days in a the given month
     * @param hour 0 to 23
     * @param minute 0 to 59
     * @param second 0 to 59
     * @param millisecond 0 to 999
     */
    dateTimeFromParts(year: number, month: number, day: number,hour: number, minute: number, second: number, millisecond: number): DateTime;

    /**
     * Initializes a new instance of the DateTime structure to the specified year, month, day, hour, minute, second, and millisecond.
     * Corresponds to the SQL Server's DATETIME2FROMPARTS(year, month, day, hour, minute, second, fractions, precision).
     * @param year The Year from 1753 to 9999
     * @param month 1 to 12
     * @param day 1 to days in a the given month
     * @param hour 0 to 23
     * @param minute 0 to 59
     * @param second 0 to 59
     * @param fractions 0 to 9999999
     * @param precision 0 to 7
     */
    dateTime2FromParts(year: number, month: number, day: number,hour: number, minute: number, second: number, fractions: number, precision: number): DateTime;    
 
    /**
     * Initializes a new instance of the DateTimeOffset structure to the specified year, month, day, hour, minute, second, fractions, hourOffset,
     * minuteOffset and precision. Corresponds to the SQL Server's
     * DATETIMEOFFSETFROMPARTS(year, month, day, hour, minute, seconds, fractions, hour_offset, minute_offset, precision) .
     * @param year The Year from 1753 to 9999
     * @param month 1 to 12
     * @param day 1 to days in a the given month
     * @param hour 0 to 23
     * @param minute 0 to 59
     * @param second 0 to 59
     * @param fractions 0 to 9999999
     * @param hourOffset 0 to 23
     * @param minuteOffset 0 to 59
     * @param precision 0 to 7
     */
    dateTimeOffsetFromParts(year: number, month: number, day: number,
        hour: number, minute: number, second: number, fractions: number,
        hourOffset: number, minuteOffset: number, precision: number): DateTime;

    /**
     * A DbFunction method stub that can be used in LINQ queries to target the SQL Server FREETEXT store function.
     * @param propertyReference The property on which the search will be performed.
     * @param freeText The text that will be searched for in the property.
     * @param languageTerm A Language ID from the sys.syslanguages table.
     */
    freeText(propertyReference: any, freeText: string, languageTerm?: number): boolean;

    /**
     * Validate if the given string is a valid date. Corresponds to the SQL Server's ISDATE('date').
     * @param expression Expression to validate
     */
    isDate(expression: string): boolean;

    /**
     * Validate if the given string is a valid numeric. Corresponds to the SQL Server's ISNUMERIC(expression).
     * @param expression Expression to validate
     */
    isNumeric(expression: string): boolean;


    /**
     * An implementation of the SQL LIKE operation. On relational databases this is usually directly translated to SQL.
     * Note that the semantics of the comparison will depend on the database configuration. In particular, it may be either case-sensitive or case-insensitive.
     * @param matchExpression The string that is to matched
     * @param pattern The pattern which may involve wildcards `%,_,[,],^`
     * @returns boolean
     */
    like(matchExpression: string, pattern: string): boolean;

    /**
     * A random double number generator which generates a number between 0 and 1, exclusive.
     */
    random(): number;

}

interface IEF {
    functions: IDbFunctions;
}

const EF: IEF = {
} as any;

export default EF;
