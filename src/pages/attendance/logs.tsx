import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Box, Divider, Flex, Grid, GridItem, Icon, Input, InputGroup, InputLeftElement, InputRightElement, Spacer, Stack, Text } from '@chakra-ui/react'
import { collection, Timestamp, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestore } from '../../config/firebase';
import { ChevronRightIcon } from '@chakra-ui/icons'
import { useAuth } from '../../context/AuthContext';
import { forwardRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Navbar } from '../../components/Navbar';
import { FiCalendar, FiMinusSquare, FiPlusSquare } from 'react-icons/fi';
import ReactDatePicker from "react-datepicker";
import { useRouter } from 'next/router';

const AttendanceLog = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [dateList, setDateList] = useState([])
  const [groupedAttendance, setGroupedAttendance] = useState([])
  const [date, setDate] = useState(new Date())

  const initData = (currentPeriod) => {
    const _date = new Date()
    _date.setFullYear(currentPeriod.year, currentPeriod.month, 1)
    const currentDate = new Date()
    let maxDate = currentDate.getDate()
    if (format(_date, 'YMM') < format(currentDate, 'YMM')) {
      _date.setFullYear(_date.getFullYear(), _date.getMonth() +1, 0)
      maxDate = _date.getDate()
    } else if (format(_date, 'YMM') > format(currentDate, 'YMM')) {
      setDateList([])
      return
    } else{
    }

    const dateListTmp = []
    for (let i = 1; i <= maxDate; i++) {
      let _date = new Date(currentPeriod.year, currentPeriod.month, i)
      dateListTmp.push({
        key: format(_date, 'YMMdd'),
        unixTimestamp: _date.getTime(),
        year: currentPeriod.year,
        month: currentPeriod.month,
        date: i
      })
    }
    setDateList(dateListTmp)
  }

  const getAttendances = async (startDate, endDate) => {
    const items = []
    for (let dl of dateList) {
      items.push({key: dl.key, unixTimestamp:dl.unixTimestamp, data: []})
    }

    const q = query(collection(firestore, "checklogs"),
      where('email', '==', user.email),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp')
    )

    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        let date = new Date(doc.data().timestamp.seconds * 1000)
        let foundIndex = items.findIndex(x => x.key == format(date, 'YMMdd'))
        if (foundIndex !== -1){
          items[foundIndex].data.push({
            id: doc.id, ...doc.data()
          })
        }
      }
    }

    items.forEach((item, i) => {
      const clockInList = item.data.filter(d => d.type == 'CLOCK_IN')
      const clockOutList = item.data.filter(d => d.type == 'CLOCK_OUT')
      items[i].clock_in = clockInList[0] ?? null
      items[i].clock_out = clockOutList.length > 0 ? clockOutList[clockOutList.length-1] : null
    })

    setGroupedAttendance(items)
  }

  useEffect(() => {
    if (dateList.length>0) {
      const maxIndex = dateList.length -1
      const minDate = new Date(dateList[0].year, dateList[0].month, dateList[0].date, 0, 0, 0)
      const maxDate = new Date(dateList[maxIndex].year, dateList[maxIndex].month, dateList[maxIndex].date, 23, 59, 59)
      getAttendances(minDate, maxDate)
    } else {
      setGroupedAttendance([])
    }
  }, [dateList])
  
  useEffect(() => {
    initData({year: date.getFullYear(), month: date.getMonth()})
  }, [date])


  const formatAttendanceType = (str) => {
    str = str.replace(/_/g, " ")
    str = str.toLowerCase()
    return str
  }

  const gotoDetail = (id : string) => {
    router.push('/attendance/' + id)
  }

  const customDateInput = ({ value, onClick, onChange }: any, ref: any) => (
    <Input
      
      autoComplete="off"
      background="white"
      value={value}
      ref={ref}
      onClick={onClick}
      onChange={onChange}
    />
  )
  const CustomInput = forwardRef(customDateInput)

  return (
  <>
    <Navbar/>
    <Flex
      justify="center"
      minH={"100vh"}
      bg="white"
      w="full"
    >
    <Box p={4} w={'full'} position={'fixed'} bg={'white'} zIndex={2} shadow={'sm'}>
      <InputGroup className='light-theme'>
        <ReactDatePicker
          selected={date}
          onChange={(date) => setDate(date)}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          showPopperArrow={false}
          customInput={<CustomInput />}
        />
        <InputRightElement
        pointerEvents='none'
        color='gray.700'
        marginRight={1}
        children={<FiCalendar />}
      />
      </InputGroup>
    </Box>
     <Stack w={'full'} mt={'72px'}>
      <Accordion allowMultiple>
        {
          groupedAttendance.map(g => {
            return (
              <AccordionItem key={g.key} isDisabled={g.data.length > 0 ? false : true} paddingX={0} borderBottom={1}>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton _expanded={{ bg: 'white', color: 'black' }}>
                      <Grid templateColumns='repeat(4, 1fr)' alignItems={'center'} paddingX={4} w={'full'}>
                        <GridItem>
                          <Box paddingX={0} textAlign={'left'}>
                            <Text fontSize={'sm'}>{ format(new Date(g.unixTimestamp), 'ccc') }</Text>
                            <Text fontWeight={'semibold'}>{ format(new Date(g.unixTimestamp), 'dd') }</Text>
                          </Box>
                        </GridItem>
                        <GridItem textAlign={'left'}>
                          <Text fontSize={'sm'}>{ g.clock_in ? format(new Date(g.clock_in.timestamp.seconds * 1000), 'hh:mm a') : '-' }</Text>
                        </GridItem>
                        <GridItem textAlign={'left'}>
                          <Text fontSize={'sm'} paddingLeft={2}>{ g.clock_out ? format(new Date(g.clock_out.timestamp.seconds * 1000), 'hh:mm a') : '-' }</Text>
                        </GridItem>
                        <GridItem textAlign="right">
                          <Icon as={ isExpanded ? FiMinusSquare : FiPlusSquare } />
                        </GridItem>
                      </Grid>
                    </AccordionButton>
                    <AccordionPanel pb={0} marginX={-4}>
                      <Stack spacing={0}>
                      { g.data.map(attendance => (
                        <div key={attendance.id}>
                          <Grid templateColumns='repeat(4, 1fr)' alignItems={'center'} paddingX={8} paddingY={4} w={'full'} bg={'gray.50'} _hover={{bg:'gray.100'}} borderBottom={1} borderColor={'red'} cursor={'pointer'} onClick={() => gotoDetail(attendance.id)}>
                          <GridItem>
                          </GridItem>
                          <GridItem textAlign={'left'}>
                            <Text fontSize={'sm'}>{ format(new Date(attendance.timestamp.seconds * 1000), 'hh:mm a') }</Text>
                          </GridItem>
                          <GridItem textAlign={'left'}>
                            <Text fontSize={'sm'} paddingLeft={2} textTransform={'capitalize'}>{ formatAttendanceType(attendance.type) }</Text>
                          </GridItem>
                          <GridItem textAlign={'right'} >
                            <Box>
                              <ChevronRightIcon boxSize={5} />
                            </Box>
                          </GridItem>
                        </Grid>
                        <Divider />
                        </div>
                      )) }
                    </Stack>
                    </AccordionPanel>
                  </>
                )}
              </AccordionItem>
            )
          })
        }
      </Accordion>
     </Stack>
    </Flex>
  </>
  );
}

export default AttendanceLog
