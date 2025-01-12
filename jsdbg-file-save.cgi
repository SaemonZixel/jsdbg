#!/bin/bash
echo "Content-Type: text/plain"
echo ""

PASSWORD = "123"

#echo "$QUERY_STRING"
declare -A params
IFS='&' read -ra query_params <<< "$QUERY_STRING"
for param in "${query_params[@]}"; do
  IFS='=' read -r key value <<< "$param"
  value <<< "$param"
  params["$key"]="$value"
done

# echo ${params[path]}

if [ "$REQUEST_METHOD" = "POST" ]; then
  if [ "x${params[password]}" = "x${PASSWORD}" ]; then
    if [ "$CONTENT_LENGTH" -gt 0 ]; then
        echo -n '' >| "${params[STOR]}" #Truncate the file
#         read -r -n $CONTENT_LENGTH POST_DATA <&0
#         echo "$POST_DATA" > "${params[STOR]}"
        cat - > "${params[STOR]}"
        echo "OK! $CONTENT_LENGTH"
        exit 0
    fi
  fi
fi

echo "Error!"
# set
