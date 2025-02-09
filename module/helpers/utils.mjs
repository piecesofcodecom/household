export function isGm() {
	return game.users.get(game.userId).isGM;
}

export async function calculateRollResult(rollFormula) {
	const roll = new Roll(rollFormula);
	await roll.roll({ async: true });
	return roll;
}

export function truncateString(string, number) {
	// If the length of string is <= to number just return string don't truncate it.
	if (string.length <= number) {
		return string;
	}
	// Return string truncated with '...' concatenated to the end of string.
	return string.slice(0, number) + '...';
}

export function signed_number(number, zero = '+0') {
	if (number === '0') {
		return zero;
	} else if (number < 0) {
		return number.toString();
	} else {
		return `+${number}`;
	}
}

export function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export const skills_list = {
    "society": ["art", "charm", "eloquence", "etiquette", "grace"],
    "academia": ["care", "craft", "culture", "insight", "investigation"],
    "war": ["athletics", "authority", "fight", "strength", "will"],
    "street": ["caution", "dexterity", "elusion", "exploration", "shoot"]
  }
