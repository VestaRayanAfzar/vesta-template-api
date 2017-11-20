import {Condition} from "../cmn/core/Condition";

export class HLCondition {
    public static and(...conditions: Array<Condition>): Condition {
        return HLCondition.conditionList(Condition.Operator.And, ...conditions);
    }

    public static or(...conditions: Array<Condition>): Condition {
        return HLCondition.conditionList(Condition.Operator.Or, ...conditions);
    }

    public static eq(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.EqualTo, filed, value, isValueOfTypeField);
    }

    public static gt(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.GreaterThan, filed, value, isValueOfTypeField);
    }

    public static gtOrEq(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.GreaterThanOrEqualTo, filed, value, isValueOfTypeField);
    }

    public static ls(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.LessThan, filed, value, isValueOfTypeField);
    }

    public static lsOrEq(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.LessThanOrEqualTo, filed, value, isValueOfTypeField);
    }

    public static like(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.Like, filed, value, isValueOfTypeField);
    }

    public static regex(filed: string, value: any, isValueOfTypeField: boolean = false) {
        return HLCondition.compare(Condition.Operator.Regex, filed, value, isValueOfTypeField);
    }

    public static inList(filed: string, values: Array<any>, isValueOfTypeField: boolean = false){
        let conditions:Array<Condition> = [];
        values.forEach(value=>conditions.push(HLCondition.compare(Condition.Operator.EqualTo,filed,value,isValueOfTypeField)));
        return HLCondition.or(...conditions);
    }

    private static compare(type: number, filed: string, value: any, isValueOfTypeField: boolean = false) {
        var equal = new Condition(type);
        equal.compare(filed, value, isValueOfTypeField);
        return equal;
    }

    public static not(condition: Condition) {
        condition.negate();
        return condition;
    }

    private static conditionList(type: number, ...conditions: Array<Condition>) {
        var condition = new Condition(type);
        for (var i = 0; i < conditions.length; i++) {
            condition.append(conditions[i]);
        }
        return condition;
    }
}
