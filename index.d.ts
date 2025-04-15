export as namespace XCScoring;

interface Options {
	lenient?: boolean;
	parseComments?: boolean;
}

interface IGCFile {
	/** UTC date of the flight in ISO 8601 format */
	date: string;
	numFlight: number | null;
	timezone: number | null;

	pilot: string | null;
	copilot: string | null;

	gliderType: string | null;
	registration: string | null;
	callsign: string | null;
	competitionClass: string | null;
	site: string | null;

	loggerId: string | null;
	loggerManufacturer: string;
	loggerType: string | null;
	firmwareVersion: string | null;
	hardwareVersion: string | null;
	geoDatum: string | null;
	geoDatumAlgorithm: string | null;
	geoPressureAlgorithm: string | null;

	task: Task | null;

	fixes: BRecord[];
	dataRecords: KRecord[];
	commentRecords: LRecord[];

	security: string | null;

	errors: Error[];
}

interface PartialIGCFile extends Partial<IGCFile> {
	fixes: BRecord[];
	dataRecords: KRecord[];
	commentRecords: LRecord[];
}

interface ARecord {
	manufacturer: string;
	loggerId: string | null;
	numFlight: number | null;
	additionalData: string | null;
}

interface BRecord {
	/** Unix timestamp of the GPS fix in milliseconds */
	timestamp: number;

	/** UTC time of the GPS fix in ISO 8601 format */
	time: string;

	latitude: number;
	longitude: number;
	valid: boolean;
	pressureAltitude: number | null;
	gpsAltitude: number | null;

	extensions: RecordExtensions;

	fixAccuracy: number | null;

	/** Engine Noise Level from 0.0 to 1.0 */
	enl: number | null;
}

interface KRecord {
	/** Unix timestamp of the data record in milliseconds */
	timestamp: number;

	/** UTC time of the data record in ISO 8601 format */
	time: string;

	extensions: RecordExtensions;
}

interface LRecord {
	code: string;
	message: string
}

interface RecordExtensions {
	[code: string]: string;
}

interface RecordExtension {
	code: string;
	start: number;
	length: number;
}

interface Task {
	declarationDate: string;
	declarationTime: string;
	declarationTimestamp: number;

	flightDate: string | null;
	taskNumber: number | null;

	numTurnpoints: number;
	comment: string | null;

	points: TaskPoint[];
}

interface TaskPoint {
	latitude: number;
	longitude: number;
	name: string | null;
}

interface Point {
	/** Longitude */
	x: number;
	/** Latitude */
	y: number;
	/** GPS fix number in the tracklog */
	r: number;
}

interface Leg {
	name: string;
	/** Scoring distance */
	d: number;
	start: Point;
	finish: Point;
}

interface ClosingPoints {
	d: number;
	in: Point;
	out: Point;
}

interface EndPoints {
	start: Point;
	finish: Point;
}

interface ScoreInfo {
	cp?: ClosingPoints;
	ep?: EndPoints;
	tp?: Point[];
	legs?: Leg[];
	/** Distance without penalty applied */
	distance: number;
	penalty: number;
	score: number;
}

interface Scoring {
	name: string;
	code: string;
	multiplier: number;
	/** Fixed closing distance that is always accepted */
	closingDistanceFixed?: number;
	/** Closing distance that does not incur any scoring penalty */
	closingDistanceFree?: number;
	/** Closing distance that is relative to the full triangle length but incurs a penalty */
	closingDistanceRelative?: number;
}

interface Opt {
	scoring: Scoring;
	flight: IGCFile & {
		/** Filtered GPS fixes when invalid=false, GPS fix number is relative to this array */
		filtered: BRecord[];
	};
	/** launch and landing are the indices of the fixes identified as launch and landing **/
	launch: number;
	landing: number;
	config: { [key: string]: any };
}

interface Solution {
	bound: number;
	currentUpperBound: number;
	id: number | string;
	opt: Opt;
	optimal?: boolean;
	processed?: number;
	score?: number;
	scoreInfo?: ScoreInfo;
	time?: number;
}

export function solver(flight: IGCFile, scoringRules: object, config?: { [key: string]: any }): Iterator<Solution, Solution>;
export const scoringRules: { [key: string]: object[] };
